const appState = {
    view: 'start',
    currentSpotId: null,
    visited: JSON.parse(localStorage.getItem('nakanoshima_visited') || '[]'),
    userPhotos: JSON.parse(localStorage.getItem('nakanoshima_photos') || '{}'),
    map: null
};

function saveState() {
    localStorage.setItem('nakanoshima_visited', JSON.stringify(appState.visited));
    localStorage.setItem('nakanoshima_photos', JSON.stringify(appState.userPhotos));
}

function render() {
    const appContainer = document.getElementById('app');
    appContainer.innerHTML = '';

    switch (appState.view) {
        case 'start':
            renderStart(appContainer);
            break;
        case 'map':
            renderMap(appContainer);
            break;
        case 'detail':
            renderDetail(appContainer);
            break;
    }
}

function init() {
    // Event Delegation
    const appContainer = document.getElementById('app');
    appContainer.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');
        const id = target.getAttribute('data-id');

        if (action === 'switch-view') {
            switchView(id);
        } else if (action === 'start-app') {
            switchView('map');
        } else if (action === 'take-photo') {
            document.getElementById('camera-input').click();
        }
    });

    appContainer.addEventListener('change', (e) => {
        if (e.target.id === 'camera-input') {
            handleUpload(e);
        }
    });

    render();
}

function renderStart(container) {
    container.innerHTML = `
        <div class="container fade-in start-view">
            <div class="start-content-box animate-up">
                <div class="concept-tag">都市環境デザイン論B</div>
                <h1>NAKANOSHIMA<br>WALK TOUR</h1>
                
                <div class="start-button-container">
                    <button class="btn btn-primary pulse" data-action="start-app" style="width: 100%; padding: 1.2rem;">Let's Start</button>
                </div>
            </div>
        </div>
    `;
}

function renderMap(container) {
    const visitedCount = appState.visited.filter(id => typeof id === 'number').length;
    const totalCount = SPOTS.filter(s => typeof s.id === 'number').length;

    container.innerHTML = `
        <div class="container map-view-container fade-in">
            <div id="map"></div>
            <div class="map-overlay-bottom">
                <div class="progress-text">${visitedCount} / ${totalCount} Spots discovered</div>
            </div>
        </div>
    `;

    setTimeout(initMap, 100);
}

function initMap() {
    if (appState.map) {
        appState.map.remove();
    }

    const latLngs = SPOTS.map(spot => [spot.lat, spot.lng]);
    const bounds = L.latLngBounds(latLngs);

    appState.map = L.map('map', {
        zoomControl: false,
        attributionControl: false,
        zoomSnap: 0.1
    }).fitBounds(bounds, { padding: [50, 50] });

    L.maplibreGL({
        style: mapStyle,
        attribution: '&copy; Stadia Maps, OpenMapTiles, OSM'
    }).addTo(appState.map);

    const colorInactive = '#4a5568'; // Darker gray
    const colorActive = '#bc4749';

    for (let i = 0; i < SPOTS.length - 1; i++) {
        const start = SPOTS[i];
        const end = SPOTS[i + 1];

        const isSegmentVisited = (typeof end.id === 'number' && appState.visited.includes(end.id)) ||
            (end.id === 'goal' && appState.visited.length >= SPOTS.filter(s => typeof s.id === 'number').length);

        L.Routing.control({
            waypoints: [
                L.latLng(start.lat, start.lng),
                L.latLng(end.lat, end.lng)
            ],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://routing.openstreetmap.de/routed-foot/route/v1',
                profile: 'foot'
            }),
            createMarker: () => null,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            show: false,
            lineOptions: {
                styles: [{
                    color: isSegmentVisited ? colorActive : colorInactive,
                    opacity: 0.6,
                    weight: 4,
                    dashArray: '8, 12'
                }]
            }
        }).addTo(appState.map);
    }

    const updateMarkerSizes = () => {
        const zoom = appState.map.getZoom();
        // Base size at zoom 15 is 34px. Scale it based on zoom level.
        const baseSize = 34;
        const scale = Math.pow(1.5, zoom - 15); // Changed power from 2 to 1.5 for a more natural feel
        const size = Math.max(26, Math.min(54, baseSize * scale)); // Lowered max size from 80 to 54
        const fontSize = Math.max(10, Math.min(18, 13 * scale)); // Lowered max font size from 24 to 18

        appState.map.eachLayer((layer) => {
            if (layer instanceof L.Marker && layer.options.icon && layer.options.icon.options.className === 'custom-div-icon') {
                const spotId = layer.options.spotId;
                const spot = SPOTS.find(s => s.id === spotId);
                const isVisited = appState.visited.includes(spotId);

                let label = spotId;
                let className = 'custom-marker';
                if (spotId === 'start') {
                    label = 'S';
                    className += ' start-marker';
                }
                if (spotId === 'goal') {
                    label = 'G';
                    className += ' goal-marker';
                }

                const width = size;
                const height = size;

                const newIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="${className} ${isVisited ? 'visited' : 'inactive'}" style="width: ${width}px; height: ${height}px; font-size: ${fontSize}px; border-radius: 50%;">${isVisited ? '✓' : label}</div>`,
                    iconSize: [width, height],
                    iconAnchor: [width / 2, height / 2]
                });
                layer.setIcon(newIcon);
            }
        });
    };

    SPOTS.forEach((spot) => {
        const isVisited = appState.visited.includes(spot.id);

        let label = spot.id;
        if (spot.id === 'start') label = 'S';
        if (spot.id === 'goal') label = 'G';

        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="custom-marker ${isVisited ? 'visited' : 'inactive'}">${isVisited ? '✓' : label}</div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
        });

        L.marker([spot.lat, spot.lng], { icon, spotId: spot.id })
            .addTo(appState.map)
            .on('click', () => showDetail(spot.id));
    });

    appState.map.on('zoomend', updateMarkerSizes);
    updateMarkerSizes();
}

function renderDetail(container) {
    const spot = SPOTS.find(s => s.id === appState.currentSpotId);
    if (!spot) return;

    const photos = appState.userPhotos[spot.id] || [];
    const hasPhoto = photos.length > 0;
    const isStartOrGoal = spot.id === 'start' || spot.id === 'goal';

    container.innerHTML = `
        <div class="container detail-view fade-in">
            <div class="detail-hero">
                <img src="${spot.image}" alt="${spot.title}">
            </div>
            
            <div class="detail-content centered-content">
                <h1>${spot.title}</h1>
                
                ${!isStartOrGoal ? `
                <div class="mission-status-area">
                    <div class="mission-card">
                        <input type="file" id="camera-input" accept="image/*" capture="environment" style="display: none;">
                        <button class="btn btn-primary" data-action="take-photo" style="width: 100%;">写真を撮る</button>
                    </div>
                    
                    ${hasPhoto ? `
                    <div class="captured-photo-section" style="margin-top: 1.5rem;">
                        <div class="captured-image-container">
                            <img src="${photos[0]}" class="captured-image">
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <div style="margin-top: 2rem;">
                    <button class="btn btn-outline" data-action="switch-view" data-id="map" style="width: 100%;">マップに戻る</button>
                </div>
            </div>
        </div>
    `;
}


function switchView(view) {
    appState.view = view;
    window.scrollTo(0, 0);
    render();
}

function showDetail(id) {
    appState.currentSpotId = id;
    switchView('detail');
}

async function handleUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const spotId = appState.currentSpotId;

    const reader = new FileReader();
    reader.onload = function (e) {
        if (!appState.userPhotos[spotId]) {
            appState.userPhotos[spotId] = [];
        }
        appState.userPhotos[spotId].unshift(e.target.result);

        if (!appState.visited.includes(spotId)) {
            appState.visited.push(spotId);
        }

        saveState();
        render();
    };
    reader.readAsDataURL(file);
}

init();
