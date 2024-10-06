import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const radius = 500; // Adjust size as needed
const geometry = new THREE.SphereGeometry(radius, 64, 64);
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('field.jpeg'); // Update the path to your texture file
// const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
const material = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.BackSide,
  color: new THREE.Color(0x3b3b3b) // Dark blue color for a night effect
});

const skyDome = new THREE.Mesh(geometry, material);
scene.add(skyDome);




const skyGeometry = new THREE.SphereGeometry(radius, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2);
const material2 = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide }); // Set color to black
const skyDome2 = new THREE.Mesh(skyGeometry, material2);

skyDome2.scale.x = 0.5;
skyDome2.scale.y = 0.5;


scene.add(skyDome2);

camera.position.set(0, 0, 0);


// Initialize OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = true; // Enable panning
controls.enableZoom = true; // Enable zooming
controls.minDistance = 1; // Minimum zoom distance
controls.maxDistance = 500; // Maximum zoom distance



async function fetchStars() {
    const response = await fetch('https://example.com/gaia-api'); // Update with actual Gaia API URL
    const data = await response.json();

    // Assuming the API returns an array of stars with RA and Dec
    const stars = data.stars; // Adjust according to actual API response
    stars.forEach(star => {
        const { ra, dec } = star; // Right Ascension and Declination in degrees

        // Convert spherical coordinates (RA, Dec) to Cartesian coordinates
        const starRadius = radius * 0.95; // Place stars slightly inside the dome
        const phi = THREE.MathUtils.degToRad(90 - dec); // Convert Dec to polar angle
        const theta = THREE.MathUtils.degToRad(ra); // Convert RA to azimuthal angle

        const x = starRadius * Math.sin(phi) * Math.cos(theta);
        const y = starRadius * Math.cos(phi);
        const z = starRadius * Math.sin(phi) * Math.sin(theta);

        // Create a small sphere to represent the star
        const starGeometry = new THREE.SphereGeometry(1, 8, 8); // Small star size
        const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const starMesh = new THREE.Mesh(starGeometry, starMaterial);
        starMesh.position.set(x, y, z);
        scene.add(starMesh);
    });
}

// Fetch and display stars
fetchStars().then(() => {
    console.log('Stars loaded');
});


// Animation loop
function animate() {
    requestAnimationFrame(animate);
    //skyDome.rotation.y += 0.001; // Rotate the dome slowly
    controls.update(); // Update the controls on each frame

    renderer.render(scene, camera);
}
animate();

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
