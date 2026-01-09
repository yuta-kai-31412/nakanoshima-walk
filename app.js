const appState = {
    view: 'start', // 'start', 'map', 'detail'
    currentSpotId: null,
    visited: JSON.parse(localStorage.getItem('nakanoshima_visited') || '[]'),
    // photos: { spotId: [dataUrl, ...] }
    userPhotos: JSON.parse(localStorage.getItem('nakanoshima_photos') || '{}'),
    map: null
};

function saveState() {
    localStorage.setItem('nakanoshima_visited', JSON.stringify(appState.visited));
    localStorage.setItem('nakanoshima_photos', JSON.stringify(appState.userPhotos));
}

function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';

    switch (appState.view) {
        case 'start':
            renderStart(app);
            break;
        case 'map':
            renderMap(app);
            break;
        case 'detail':
            renderDetail(app);
            break;
    }
}

function init() {
    // Event Delegation
    const app = document.getElementById('app');
    app.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.getAttribute('data-action');
        const id = target.getAttribute('data-id');

        if (action === 'switch-view') {
            switchView(id);
        } else if (action === 'take-photo') {
            document.getElementById('camera-input').click();
        }
    });

    app.addEventListener('change', (e) => {
        if (e.target.id === 'camera-input') {
            handleUpload(e);
        }
    });

    render();
}

function renderStart(container) {
    container.innerHTML = `
        <div class="container centered fade-in" style="background: linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.4)), url('./images/spot1.png'); background-size: cover; background-position: center; min-height: 100vh; width: 100vw; margin: 0; max-width: none;">
            <div class="glass-panel" style="max-width: 85%; width: 500px;">
                <div class="start-logo" style="margin-bottom: 1rem;">🌆</div>
                <h1 style="color: white; font-size: 2.5rem; text-shadow: 0 4px 10px rgba(0,0,0,0.2);">NAKANOSHIMA<br>TIME TRAVEL</h1>
                <div class="concept-text" style="color: rgba(255,255,255,0.9); font-size: 1.1rem; border-left: 3px solid white; padding-left: 1rem; text-align: left; margin: 2rem auto; width: fit-content;">
                    都市の進化を辿る、<br>中之島・街歩き。
                </div>
                <p style="color: white; opacity: 0.8; font-weight: 500;">スマホを「街の探知機」に変えて、<br>歴史と現代が交差する景観を巡る。</p>
                <div style="margin-top: 3rem;">
                    <button class="btn btn-primary" style="background: white; color: var(--primary-color); width: 100%;" data-action="switch-view" data-id="map">EXPLORE START</button>
                </div>
            </div>
        </div>
    `;
}

function renderMap(container) {
    const visitedCount = appState.visited.length;
    const totalCount = SPOTS.filter(s => !s.isNavigationOnly).length;

    container.innerHTML = `
        <div class="fade-in" style="height: 100vh; position: relative;">
            <div style="position: absolute; top: 20px; left: 20px; right: 20px; z-index: 1000;">
                <div class="glass-panel" style="padding: 1rem 1.5rem; border-radius: 20px; background: rgba(255,255,255,0.6);">
                    <h2 style="margin: 0; font-size: 1rem; color: var(--primary-color);">EXPLORATION MAP</h2>
                    <p style="margin: 0; font-size: 0.8rem; font-weight: 700; opacity: 0.7;">${visitedCount} / ${totalCount} SPOTS DISCOVERED</p>
                </div>
            </div>
            <div id="map" style="height: 100%; border-radius: 0;"></div>
        </div>
    `;

    setTimeout(initMap, 100);
}

function initMap() {
    if (appState.map) {
        appState.map.remove();
    }

    appState.map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([34.6935, 135.4950], 15);

    // Use custom Maputnik style (MapLibre GL) via embedded JS object to avoid CORS issues
    L.maplibreGL({
        style: mapStyle, // Loaded from style_data.js
        attribution: '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
    }).addTo(appState.map);

    const colorInactive = '#757575'; // Dark Gray
    const colorActive = '#1976D2';   // Ocean Blue (Matches primary)

    // Draw Routes (Road-based via OSRM - Foot profile)
    for (let i = 0; i < SPOTS.length - 1; i++) {
        const start = SPOTS[i];
        const end = SPOTS[i + 1];

        const isSegmentVisited = !end.isNavigationOnly && appState.visited.includes(end.id);

        L.Routing.control({
            waypoints: [
                L.latLng(start.lat, start.lng),
                L.latLng(end.lat, end.lng)
            ],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://routing.openstreetmap.de/routed-foot/route/v1',
                profile: 'foot'
            }),
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            show: false,
            createMarker: function () { return null; },
            lineOptions: {
                styles: [{
                    color: isSegmentVisited ? colorActive : colorInactive,
                    opacity: 0.9,
                    weight: 6,
                    dashArray: isSegmentVisited ? null : '10, 15'
                }]
            }
        }).addTo(appState.map);
    }

    // Draw Markers
    const spotNumbers = ['1', '2', '3', '4', '5', '6', '7', '8'];

    SPOTS.forEach((spot) => {
        const isVisited = appState.visited.includes(spot.id);
        let label = '';
        if (!spot.isNavigationOnly) {
            // If spot.id is 1-6, use circledNumbers[0-5]
            const index = typeof spot.id === 'number' ? spot.id - 1 : -1;
            label = spotNumbers[index] || spot.id;
        }

        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="custom-marker ${isVisited ? 'visited' : 'inactive'}">${isVisited ? '✓' : label}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const marker = L.marker([spot.lat, spot.lng], { icon }).addTo(appState.map);

        if (!spot.isNavigationOnly) {
            marker.on('click', () => {
                showDetail(spot.id);
            });
        }
    });
}

function renderDetail(container) {
    const spot = SPOTS.find(s => s.id === appState.currentSpotId);
    if (!spot) return;

    const photos = appState.userPhotos[spot.id] || [];
    const hasPhoto = photos.length > 0;

    container.innerHTML = `
        <div class="spot-card-container fade-in">
            <div class="spot-card">
                <div class="card-bg-image" style="background-image: url('${spot.image}')"></div>
                <div class="card-gradient-overlay"></div>
                
                <div class="card-close-btn" data-action="switch-view" data-id="map">✕</div>

                <div class="card-top-info">
                    <span class="card-discount-tag">${spot.subtitle || 'Information'}</span>
                </div>

                <div class="card-pagination">
                    <div class="dot active"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>

                <div class="card-content">
                    <div class="card-title-row">
                        <h1 class="card-title" style="letter-spacing: -0.02em;">${spot.title}</h1>
                        <div class="card-badge-price" style="background: var(--blue-gradient); border: 1px solid rgba(255,255,255,0.2);">
                             ${hasPhoto ? '✓' : 'SPOT ' + spot.id}
                        </div>
                    </div>

                    <p class="card-description" style="font-weight: 400; opacity: 0.95;">
                        ${spot.points}
                    </p>

                    <div class="card-tags-row">
                        <div class="card-tag" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.1); font-size: 0.75rem;">
                            ${hasPhoto ? 'Mission Complete' : 'Discovery Mission'}
                        </div>
                        <div class="card-tag" style="background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.1); font-size: 0.75rem;">Liquid Glass</div>
                    </div>

                    <div class="card-action-area">
                        ${!hasPhoto ? `
                            <input type="file" id="camera-input" accept="image/*" capture="environment" style="display: none;">
                            <button class="btn-card-action" data-action="take-photo">
                                Take Photo
                            </button>
                        ` : `
                            <a href="${photos[0]}" download="nakanoshima_${spot.id}.jpg" class="btn-card-action">
                                Save Memory
                            </a>
                        `}
                    </div>
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

function handleUpload(event) {
    const file = document.getElementById('camera-input').files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const spotId = appState.currentSpotId;

        if (!appState.userPhotos[spotId]) {
            appState.userPhotos[spotId] = [];
        }
        appState.userPhotos[spotId].unshift(e.target.result);

        if (!appState.visited.includes(spotId)) {
            appState.visited.push(spotId);
        }

        saveState();
        render(); // Immediately re-render to swap UI
    };
    reader.readAsDataURL(file);
}

// Initial Call
init();
