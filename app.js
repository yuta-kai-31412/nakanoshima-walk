const appState = {
    view: 'start',
    currentSpotId: null,
    visited: JSON.parse(localStorage.getItem('nakanoshima_visited') || '[]'),
    userPhotos: JSON.parse(localStorage.getItem('nakanoshima_photos') || '{}'),
    map: null
};



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
        case 'stamp-rally':
            renderStampRally(appContainer);
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
        } else if (action === 'view-stamps') {
            switchView('stamp-rally');
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
    const progressPercent = totalCount > 0 ? (visitedCount / totalCount) * 100 : 0;

    const isGoalReached = appState.visited.length >= SPOTS.filter(s => typeof s.id === 'number').length;

    container.innerHTML = `
        <div class="container map-view-container fade-in">
            <div id="map"></div>
            <div class="map-overlay-bottom centered ${isGoalReached ? 'goal-reached' : ''}" 
                 ${isGoalReached ? 'data-action="view-stamps" style="cursor: pointer;"' : ''}>
                <div class="progress-container">
                    <div class="progress-track">
                        <div class="progress-tick-container">
                            ${SPOTS.filter(s => typeof s.id === 'number').map((s, index, arr) => {
        const percent = ((index + 1) / arr.length) * 100;
        const reached = appState.visited.includes(s.id);
        return `<div class="progress-tick ${reached ? 'reached' : ''}" style="left: ${percent}%;"></div>`;
    }).join('')}
                        </div>
                        <div class="progress-fill" style="width: ${progressPercent}%;">
                            <div class="walker-icon">🚶‍♂️</div>
                        </div>
                        <div class="goal-icon-progress">🚩</div>
                    </div>
                </div>
                <span class="progress-text">
                    ${totalCount > 0
            ? (isGoalReached ? 'Tap to view your Stamp Sheet! ✨' : `${visitedCount} / ${totalCount} Spots discovered`)
            : 'Welcome to Nakanoshima! Walk to the Goal 🚩'}
                </span>
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
                    label = 'START';
                    className += ' start-marker';
                }
                if (spotId === 'goal') {
                    label = 'GOAL';
                    className += ' goal-marker';
                }

                // For START/GOAL, make it a pill shape (capsule)
                const isLong = spotId === 'start' || spotId === 'goal';
                const width = isLong ? size * 2.2 : size;
                const height = size;

                const newIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div class="${className} ${isVisited ? 'visited' : 'inactive'}" style="width: ${width}px; height: ${height}px; font-size: ${fontSize}px; border-radius: ${height / 2}px;">${isVisited ? '✓' : label}</div>`,
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
        if (spot.id === 'start') label = 'START';
        if (spot.id === 'goal') label = 'GOAL';

        const isLong = spot.id === 'start' || spot.id === 'goal';
        const width = isLong ? 74 : 34; // Initial size based on zoom 15
        const height = 34;

        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="custom-marker ${isVisited ? 'visited' : 'inactive'}" style="width: ${width}px; height: ${height}px; border-radius: ${height / 2}px;">${isVisited ? '✓' : label}</div>`,
            iconSize: [width, height],
            iconAnchor: [width / 2, height / 2]
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
                <p class="detail-subtitle">${spot.subtitle || ''}</p>

                <div class="spot-info-section">
                    ${spot.points ? `
                    <div class="info-block">
                        <h3>集合場所</h3>
                        <p>${spot.points.replace(/\n/g, '<br>')}</p>
                    </div>` : ''}
                    ${spot.features ? `
                    <div class="info-block">
                        <h3>アクセス例</h3>
                        <p>${spot.features.replace(/\n/g, '<br>')}</p>
                    </div>` : ''}
                    ${spot.challenges ? `
                    <div class="info-block">
                        <h3>Challenges</h3>
                        <p>${spot.challenges.replace(/\n/g, '<br>')}</p>
                    </div>` : ''}
                </div>
                
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


function renderStampRally(container) {
    let photoSpots = SPOTS.filter(s => typeof s.id === 'number');
    if (photoSpots.length === 0) photoSpots = SPOTS; // Show all if no numbered spots

    let collageHtml = '';
    photoSpots.forEach(spot => {
        const photo = appState.userPhotos[spot.id] ? appState.userPhotos[spot.id][0] : null;
        collageHtml += `
            <div class="collage-item">
                ${photo ? `<img src="${photo}">` : `<div class="empty-marker">?</div>`}
                <div class="stamp-id-label">${spot.id}</div>
            </div>
        `;
    });

    container.innerHTML = `
        <div class="container stamp-rally-view fade-in">
            <div class="stamp-rally-content animate-up">
                <div class="concept-tag">STAMPLARRY</div>
                <h2 class="congrats-text">COMPLETE!</h2>
    
                
                <div class="collage-container">
                    ${collageHtml}
                </div>

                <div class="button-group">
                    <button class="btn btn-primary" onclick="window.print()" style="width: 100%; margin-bottom: 1rem;">シートを保存</button>
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

    try {
        const compressedDataUrl = await compressImage(file, 1024); // Resize to max 1024px

        if (!appState.userPhotos[spotId]) {
            appState.userPhotos[spotId] = [];
        }
        appState.userPhotos[spotId].unshift(compressedDataUrl);

        if (!appState.visited.includes(spotId)) {
            appState.visited.push(spotId);
        }

        saveState();
        render();
    } catch (error) {
        console.error("Failed to process image:", error);
        alert("画像の処理に失敗しました。容量不足の可能性があります。");
    }
}

function compressImage(file, maxWidth) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress to JPEG with 0.7 quality
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

function saveState() {
    try {
        localStorage.setItem('nakanoshima_visited', JSON.stringify(appState.visited));
        localStorage.setItem('nakanoshima_photos', JSON.stringify(appState.userPhotos));
    } catch (e) {
        console.error("LocalStorage save failed:", e);
        if (e.name === 'QuotaExceededError') {
            alert("ブラウザの保存容量を超えました。古い写真を削除するか、ブラウザの設定を確認してください。");
        }
    }
}

init();
