let scene, camera, renderer, xrSession = null;
let arrow, destination = null, markedLocations = {};
let startARButton, stopARButton, mapButton, destinationDropdown, saveButton;

// Get DOM elements
startARButton = document.getElementById('start-ar');
stopARButton = document.getElementById('stop-ar');
mapButton = document.getElementById('map-area');
destinationDropdown = document.getElementById('destination');
saveButton = document.getElementById('save-locations');

function initAR() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  arrow = createNavigationArrow();
  scene.add(arrow);

  navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['local-floor', 'hit-test'] })
    .then(onSessionStarted)
    .catch(err => console.error('Failed to start AR session:', err));
}

function createNavigationArrow() {
  const geometry = new THREE.ConeGeometry(0.05, 0.2, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0, -1);
  return mesh;
}

function onSessionStarted(session) {
  xrSession = session;
  renderer.xr.setSession(session);
  
  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
    updateNavigationArrow();
  });
}

function updateNavigationArrow() {
  if (destination && markedLocations[destination]) {
    const targetPosition = markedLocations[destination];
    const direction = new THREE.Vector3().subVectors(targetPosition, camera.position).normalize();
    arrow.position.copy(camera.position);
    arrow.position.add(direction.multiplyScalar(0.5));
  }
}

function markLocation() {
  const locationName = prompt("Enter a name for this location (e.g., Room 1):");
  if (locationName) {
    const cameraPosition = camera.position.clone();
    fetch('/api/locations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: locationName, position: cameraPosition.toArray() })
    })
    .then(response => response.json())
    .then(data => {
      markedLocations[locationName] = new THREE.Vector3().fromArray(data.position);
      updateDestinationDropdown();
      alert(`${locationName} marked at (${cameraPosition.x.toFixed(2)}, ${cameraPosition.y.toFixed(2)}, ${cameraPosition.z.toFixed(2)})`);
    })
    .catch(err => console.error('Error marking location:', err));
  }
}

function saveLocations() {
  fetch('/api/save')
    .then(response => response.json())
    .then(data => alert('Locations saved!'))
    .catch(err => console.error('Error saving locations:', err));
}

function updateDestinationDropdown() {
  destinationDropdown.innerHTML = '<option value="">--Select Destination--</option>';
  for (const location in markedLocations) {
    const option = document.createElement('option');
    option.value = location;
    option.textContent = location;
    destinationDropdown.appendChild(option);
  }
}

startARButton.addEventListener('click', () => {
  initAR();
  startARButton.style.display = 'none';
  stopARButton.style.display = 'block';
});

stopARButton.addEventListener('click', () => {
  if (xrSession) {
    xrSession.end();
    xrSession = null;
    stopARButton.style.display = 'none';
    startARButton.style.display = 'block';
  }
  scene.remove(arrow);
});

mapButton.addEventListener('click', markLocation);

saveButton.addEventListener('click', saveLocations);

destinationDropdown.addEventListener('change', (event) => {
  destination = event.target.value;
});
