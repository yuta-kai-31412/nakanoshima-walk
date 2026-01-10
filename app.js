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
        <div class="start-bg-overlay"></div>
        <div class="container centered fade-in start-view">
            <div style="margin-top: auto; margin-bottom: auto;">
                <div class="concept-text">都市の記憶を辿る、時間旅行。</div>
                <h1>NAKANOSHIMA<br>TIME TRAVEL</h1>
                <p style="color: var(--text-sub); max-width: 280px; margin: 0 auto;">
                    スマホを街の探知機に変えて、<br>歴史と現代が交差する景色を記憶しましょう。
                </p>
            </div>
            <div class="sticky-bottom">
                <button class="btn btn-primary pulse" data-action="switch-view" data-id="map">EXPLORE START</button>
            </div>
        </div>
    `;
}

function renderMap(container) {
    const visitedCount = appState.visited.filter(id => typeof id === 'number').length;
    const totalCount = SPOTS.filter(s => typeof s.id === 'number').length;

    container.innerHTML = `
        <div class="container fade-in">
            <div class="map-header">
                <h2>Exploration Map</h2>
                <div class="progress-text">${visitedCount} / ${totalCount} Spots discovered</div>
            </div>
            <div id="map"></div>
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
    }).fitBounds(bounds, { padding: [50, 50] }); // Changed setView to fitBounds

    // Light style for MapLibre
    L.maplibreGL({
        style: mapStyle,
        attribution: '&copy; Stadia Maps, OpenMapTiles, OSM'
    }).addTo(appState.map);

    // Road-based Routing Dashed Lines (OSRM)
    const colorInactive = '#cbd5e1';
    const colorActive = '#0ea5e9';

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

    // Markers
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

        L.marker([spot.lat, spot.lng], { icon })
            .addTo(appState.map)
            .on('click', () => showDetail(spot.id));
    });
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
                <div class="detail-label">
                    ${spot.subtitle}
                    ${hasPhoto ? ' • MISSION COMPLETE' : ''}
                </div>
                <h1>${spot.title}</h1>
                
                <div class="glass-panel info-section">
                    <div class="info-item">
                        <h3>${isStartOrGoal ? '基本情報' : '都市計画のポイント'}</h3>
                        <p>${spot.points}</p>
                    </div>
                    <div class="info-item">
                        <h3>${isStartOrGoal ? '周辺・交通' : '特色'}</h3>
                        <p>${spot.features}</p>
                    </div>
                    <div class="info-item">
                        <h3>${isStartOrGoal ? '展望' : '課題'}</h3>
                        <p>${spot.challenges}</p>
                    </div>
                </div>

                ${!isStartOrGoal ? `
                <div class="mission-status-area">
                    ${!hasPhoto ? `
                    <div class="mission-card">
                        <div class="mission-tag">CURRENT MISSION</div>
                        <p style="font-size: 0.85rem; margin-bottom: 1.5rem;">
                            この風景を撮影して、あなたの「しおり」に保存しましょう。
                        </p>
                        <input type="file" id="camera-input" accept="image/*" capture="environment" style="display: none;">
                        <button class="btn btn-primary" data-action="take-photo">
                            写真を撮る
                        </button>
                    </div>
                    ` : `
                    <div class="captured-photo-section">
                        <div class="captured-image-container">
                            <img src="${photos[0]}" class="captured-image">
                        </div>
                        <div style="text-align: center;">
                            <a href="${photos[0]}" download="nakanoshima_${spot.id}.jpg" class="btn btn-save-large">
                                画像を保存する
                            </a>
                        </div>
                    </div>
                    `}
                </div>
                ` : ''}
            </div>
        </div>
        
        <div class="sticky-bottom">
            <button class="btn btn-outline" data-action="switch-view" data-id="map">リストに戻る</button>
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
    const file = event.target.files[0];
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
        render();
    };
    reader.readAsDataURL(file);
}

init();
