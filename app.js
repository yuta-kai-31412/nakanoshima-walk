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
        <div class="container centered fade-in">
            <div class="start-logo">🏙️</div>
            <h1>NAKANOSHIMA<br>URBAN AXIS</h1>
            <div class="concept-text">
                都市の進化を辿る、<br>中之島・街歩き。
            </div>
            <p>スマホを「街の探知機」に変えて、<br>見上げる景色を記憶しましょう。</p>
            <div class="sticky-bottom">
                <button class="btn btn-primary" data-action="switch-view" data-id="map">EXPLORE START</button>
            </div>
        </div>
    `;
}

function renderMap(container) {
    const visitedCount = appState.visited.length;
    const totalCount = SPOTS.length;

    container.innerHTML = `
        <div class="container fade-in" style="padding-bottom: 8rem;">
            <h2>EXPLORATION MAP</h2>
            <p>${visitedCount} / ${totalCount} SPOTS DISCOVERED</p>
            <div id="map"></div>
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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(appState.map);

    const colorInactive = '#a0d8ef'; // Light Blue
    const colorActive = '#ff8c00';   // Vibrant Orange

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
    const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥'];

    SPOTS.forEach((spot) => {
        const isVisited = appState.visited.includes(spot.id);
        let label = '';
        if (!spot.isNavigationOnly) {
            // If spot.id is 1-6, use circledNumbers[0-5]
            const index = typeof spot.id === 'number' ? spot.id - 1 : -1;
            label = circledNumbers[index] || spot.id;
        }

        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="custom-marker ${isVisited ? 'visited' : 'inactive'}">${isVisited ? '✓' : label}</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
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
        <div class="container fade-in" style="padding-bottom: 10rem;">
            <div class="detail-label">
                ${spot.subtitle} 
                ${hasPhoto ? '<span class="status-badge">MISSION COMPLETE</span>' : ''}
            </div>
            <h1>${spot.title}</h1>
            
            <div class="detail-img-wrap" style="${hasPhoto ? 'display: none;' : ''}">
                <img src="${spot.image}" class="detail-img" alt="${spot.title}">
            </div>

            <!-- Always visible Info Section -->
            <div class="info-section">
                <div class="info-item">
                    <h3>都市計画のポイント</h3>
                    <p>${spot.points}</p>
                </div>
                <div class="info-item">
                    <h3>特色</h3>
                    <p>${spot.features}</p>
                </div>
                <div class="info-item">
                    <h3>課題</h3>
                    <p>${spot.challenges}</p>
                </div>
            </div>

            <!-- Conditional Mission or Captured Photo -->
            <div class="mission-status-area">
                ${!hasPhoto ? `
                <div class="mission-card">
                    <span class="mission-tag">CURRENT MISSION</span>
                    <p>この風景を撮影して、あなたの「しおり」に保存しましょう。</p>
                    <input type="file" id="camera-input" accept="image/*" capture="environment" style="display: none;">
                    <button class="btn btn-primary" data-action="take-photo">
                        📷 写真を撮る
                    </button>
                </div>
                ` : `
                <div class="captured-photo-section">
                    <div class="captured-image-container full-width">
                        <img src="${photos[0]}" class="captured-image">
                    </div>
                    <div class="photo-footer-actions">
                        <a href="${photos[0]}" download="nakanoshima_${spot.id}.jpg" class="btn btn-secondary btn-save-large">
                            💾 この画像を端末に保存
                        </a>
                    </div>
                </div>
                `}
            </div>

            ${hasPhoto && photos.length > 1 ? `
                <div class="user-photos-section">
                    <h3>過去の撮影記録</h3>
                    <div class="gallery-grid">
                        ${photos.slice(1).map(photo => `
                            <div class="gallery-item">
                                <img src="${photo}" loading="lazy">
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
        
        <div class="sticky-bottom">
            <button class="btn btn-outline" data-action="switch-view" data-id="map">戻る</button>
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
