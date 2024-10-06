import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true,  preserveDrawingBuffer: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const radius = 100;
const geometry = new THREE.SphereGeometry(radius, 64, 64);
const textureLoader = new THREE.TextureLoader();

const texturePaths = ["horizon1.jpg", "horizon2.jpg", "horizon3.jpg", "horizon4.jpg"];
const randomTexturePath = texturePaths[Math.floor(Math.random() * texturePaths.length)];

const texture = textureLoader.load(randomTexturePath);
const material = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.DoubleSide,
  color: new THREE.Color(0x292929),
  transparent: true,
  opacity: 1,
});
const skyDome = new THREE.Mesh(geometry, material);
scene.add(skyDome);

let starsData;
var stars = [];
var belowHorizonStars = []; 


const slider = document.getElementById("lightnessSlider");
slider.addEventListener("input", (event) => {
  updateColor(event.target.value);
});

function updateColor(lightness) {
  const color = new THREE.Color(`hsl(0, 0%, ${lightness}%)`);
  material.color.set(color);
}

const magSlider = document.getElementById("magSlider");
magSlider.addEventListener("input", (event) => {
  var userMag = event.target.value;
  stars.forEach(([star, app_mag]) => {
    if (app_mag > userMag) {
      star.visible = false;
    } else if (app_mag <= userMag) {
      star.visible = true;
    }
  });
});

// const horizon = new THREE.SphereGeometry(radius, 64, 64, 0, Math.PI * 2, Math.PI / 2, Math.PI);
// const material = new THREE.MeshBasicMaterial({ color: 0x3b3b3b, side: THREE.BackSide }); // Set color to black
// const dome = new THREE.Mesh(horizon, material);
// scene.add(dome)

// const skyGeometry = new THREE.SphereGeometry(radius, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2);
// const material2 = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide }); // Set color to black
// const skyDome2 = new THREE.Mesh(skyGeometry, material2);

// skyDome2.scale.x = 2;
// skyDome2.scale.y = 2;

// scene.add(skyDome2);

const loadingImage = document.getElementById("gif");

async function loadStars() {
  const urlParams = new URLSearchParams(window.location.search);
  const planet = urlParams.get("planet");
  const mag = urlParams.get("mag") || 7;
  const response = await fetch(
    `http://127.0.0.1:5000/stars?planet=${planet}&mag=${mag}`
  );
  starsData = await response.json();
}

function renderStars() {
  const magnitudes = starsData.map((star) => star.app_mag);
  const minMag = Math.min(...magnitudes);
  const maxMag = Math.max(...magnitudes);

  starsData.forEach(({ ra, dec, dist, app_mag, SpType }) => {
    const star = createStar(ra, dec, dist, app_mag, minMag, maxMag, SpType);
    scene.add(star);

    if (app_mag > 5) {
      star.visible = false;
    } else if (app_mag <= 5) {
      star.visible = true;
    }

    if (star.position.y < 0) {
      belowHorizonStars.push([star, app_mag]);
      star.visible = false;
    } else {
      stars.push([star, app_mag]);
    }
  });

  loadingImage.style.display = "none";
}

loadStars()
  .then((starsData) => {
    renderStars(starsData);
  })
  .catch((error) => {
    console.error("Error loading stars:", error);
  });

function createStar(ra, dec, dist, mag, minMag, maxMag, SpType, belowGround) {
  const r = mapMagnitudeToRadius(mag, minMag, maxMag);
  const color = mapSpTypeToColor(SpType);
  const geometry = new THREE.SphereGeometry(r);
  // const material = new THREE.MeshBasicMaterial({ color: color }); // White color
  const material = new THREE.MeshStandardMaterial({
    emissive: color,
    emissiveIntensity: 1,
    color: 0x000000, 
  });

  const star = new THREE.Mesh(geometry, material);
  const raInRadians = ra * (Math.PI / 180);
  const decInRadians = dec * (Math.PI / 180);

  const x = radius * 1 * Math.cos(decInRadians) * Math.cos(raInRadians);
  const y = radius * 1 * Math.sin(decInRadians);
  const z = radius * 1 * Math.cos(decInRadians) * Math.sin(raInRadians);

  star.position.set(x, y, z);
  return star;
}

const globe = document.getElementById("globe");
let isDull = false;

globe.addEventListener("click", () => {
  toggleStarsVisibility();
  if (isDull) {
    globe.setAttribute("fill", "#ffffff");
  } else {
    globe.setAttribute("fill", "#3b3b3b");
  }
  isDull = !isDull;
});

function toggleStarsVisibility() {
  if (material.opacity === 0.5) {
    material.opacity = 1;
  } else {
    material.opacity = 0.5;
  }
  belowHorizonStars.forEach(([star, app_mag]) => {
    star.visible = !star.visible;
  });
}

function mapSpTypeToColor(SpType) {
  const spectralClass = SpType.charAt(0).toUpperCase();
  switch (spectralClass) {
    case "O":
      return "#9bb0ff"; // Blue-violet
    case "B":
      return "#aabfff"; // Blue-white
    case "A":
      return "#cad7ff"; // White
    case "F":
      return "#f8f7ff"; // Yellow-white
    case "G":
      return "#fff4e8"; // Yellow
    case "K":
      return "#ffd2a1"; // Orange
    case "M":
      return "#ffcc6f"; // Red-orange
    default:
      return "#ffffff"; // White for unknown 
  }
}

function mapMagnitudeToRadius(mag, minMag, maxMag, scaleFactor = 2) {
  const normalizedMag = (mag - minMag) / (maxMag - minMag);
  const exponentialScale = Math.pow(1 - normalizedMag, scaleFactor);
  const mappedRadius = exponentialScale * (0.7 - 0.1) + 0.1;

  return mappedRadius;
}



const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isDrawing = false; 
let lastPoint = null;

const lines = []; 

document.getElementById('delete-button').addEventListener('click', () => {
 
    lines.forEach(line => skyDome.remove(line));
    lines.length = 0; 


});



document.getElementById('search').addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
      event.preventDefault();
      search();
  }
});

function search() {

  const inputValue = document.getElementById('search').value;
  const encodedValue = encodeURIComponent(inputValue);
  const url = `?planet=${encodedValue}`;
  window.open(url); 
  
}



document.getElementById('screenshot').addEventListener('click', () => {
  saveAsImage();
});


var strDownloadMime = "image/octet-stream";


function saveAsImage() {
        var imgData;

        try {
            var strMime = "image/jpeg";
            imgData = renderer.domElement.toDataURL(strMime);

            saveFile(imgData.replace(strMime, strDownloadMime), "screenshot.jpg");

        } catch (e) {
            console.log(e);
            return;
        }

    }

    var saveFile = function (strData, filename) {
        var link = document.createElement('a');
        if (typeof link.download === 'string') {
            document.body.appendChild(link);
            link.download = filename;
            link.href = strData;
            link.click();
            document.body.removeChild(link);
        } else {
            location.replace(uri);
        }
    }


function onMouseClick(event) {
  if (!isDrawing || event.target.id === 'draw-button') return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(skyDome); 

  if (intersects.length > 0) {
      const point = intersects[0].point; 

      if (lastPoint) {
          connectPoints(lastPoint, point);
          lastPoint = null; 
          isDrawing = false; 
      } else {
          lastPoint = point.clone();
      }
  }
}

window.addEventListener('click', onMouseClick, false);


function connectPoints(start, end) {
  const points = [start, end];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff5c26 });
  const line = new THREE.Line(lineGeometry, lineMaterial);

  skyDome.add(line);
  lines.push(line);
}


document.addEventListener('keydown', function(event) {
  if (event.key === 'g'){

    toggleStarsVisibility();
  if (isDull) {
    globe.setAttribute("fill", "#ffffff");
  } else {
    globe.setAttribute("fill", "#3b3b3b");
  }
  isDull = !isDull;

  }

  else if (event.key === 'c') {
      isDrawing = !isDrawing;

      if (isDrawing) {
          lastPoint = null;
      } else {
      }
  }
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false; 
controls.enableZoom = true;
controls.minDistance = 0;
controls.maxDistance = 200;
controls.rotateSpeed *= -1;

camera.position.set(0, 0, 5);
controls.target.set(1, 0.5, 0);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
