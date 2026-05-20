var scene, camera, renderer, clock, mixer, actions = [], mode, isWireframe=false, params, lights;
let loadedModel;
let sound;
let soundReady = false;

init();

function init() {
  const assetPath = '../assets/'; // Path to assets
  
    clock = new THREE.Clock();
    
    // Create the scene
    scene = new THREE.Scene();

    const textureLoader = new THREE.TextureLoader();

    textureLoader.load('./assets/images/tap.jfif', function(texture) {
        scene.background = texture;
    });
    
    // Set up the camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 8);
    // camera.position.set(-5, 25, 20);


    // Add lighting
    const ambient = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
    scene.add(ambient);
    
    lights = {};

      lights.spot = new THREE.SpotLight();
      lights.spot.visible = true;
      lights.spot.position.set(0, 20, 0);
      lights.spotHelper = new THREE.SpotLightHelper(lights.spot);
      lights.spotHelper.visible = false;
      scene.add(lights.spotHelper);
      scene.add(lights.spot);

      params = {
        spot: {
          enable: false,
          color: 0xffffff,
          distance: 20,
          angle: Math.PI/2,
          penumbra: 0,
          helper: false,
          moving:false,
        }
      }

      const gui = new dat.GUI ({autoPlace: false});
      const guiContainer = document.getElementById('gui-container');
      guiContainer.appendChild(gui.domElement);
      guiContainer.style.position = 'fixed';

      const spot = gui.addFolder('Spot');
      spot.open();
      spot.add(params.spot, 'enable').onChange(value => {
        lights.spot.visible = value
      });
      spot.addColor(params.spot, 'color').onChange(value => lights.spot.color = new THREE.Color(value));
      spot.add(params.spot, 'distance').min(0).max(20).onChange(value => lights.spot.distance = value);
      spot.add(params.spot, 'angle').min(0.1).max(6.28).onChange(value => lights.spot.angle = value);
      spot.add(params.spot, 'penumbra').min(0).max(1).onChange(value => lights.spot.penumbra = value);
      spot.add(params.spot, 'helper').onChange(value => lights.spotHelper = value);
      spot.add(params.spot, 'moving');


    const light = new THREE.DirectionalLight(0xFFFFFF, 2);
    light.position.set(0, 10, 2);
    scene.add(light);
    
    // Set up the renderer
    const canvas = document.getElementById('threeContainer');
    renderer = new THREE.WebGLRenderer({ canvas: canvas });
    renderer.setPixelRatio(window.devicePixelRatio);
    resize();


  // Add OrbitControls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 2, 0);
  //controls.target.set(1, 2, 0);
  controls.update();

  // Audio logic
  const listener = new THREE.AudioListener();
  camera.add(listener);

  sound = new THREE.Audio(listener);

  const audioLoader = new THREE.AudioLoader();
  audioLoader.load('./assets/audio/pump2.mp3', function(buffer){
    sound.setBuffer(buffer);
    sound.setLoop(true);
    sound.setVolume(1.0);
    soundReady = true;
    console.log("Sound loaded");
  }, undefined, function(error) {
    console.error("Sound failed to load:", error);
  
  });
  
  // Button to control animations
  mode = 'open';
  const btn = document.getElementById("btn");
  btn.addEventListener('click', function() {
    if (actions.length > 0) {
      if (mode === "open") {
        actions.forEach(action => {
          
          action.reset();
          action.timeScale = 0.7;

          // Play animation only 3 times
          action.setLoop(THREE.LoopRepeat, 3);

          
          action.clampWhenFinished = true;

          //action.timeScale = 0.7;
          action.play();

          // audio
          if (sound.isPlaying) sound.stop();
          sound.play();
        });
      }
    }
  });

  // Wireframe
  const wireframeBtn = document.getElementById("toggleWireframe")
  wireframeBtn.addEventListener('click', function(){
    isWireframe = !isWireframe;
    toggleWireframe(isWireframe);
  });

  // Rotation
  const rotateBtn = document.getElementById("rotate");
  rotateBtn.addEventListener('click', function(){
    if (loadedModel){
      const angle = Math.PI / 8;

      loadedModel.rotation.y += angle;

    }
    else{
      console.warn('Model not loaded yet');
    }
  });
  
  // Load the glTF model
  const loader = new THREE.GLTFLoader();
  loader.load('./assets/models/pump.glb', function(gltf) {
    const model = gltf.scene;
    // making the model bigger
    model.scale.set(3.5, 3.5, 3.5)
    model.position.set(0, 0, 3);
    scene.add(model);

    loadedModel = model;
    
    // Set up animations 
    mixer = new THREE.AnimationMixer(model);

    mixer.addEventListener('finished', function () {
      if (sound && sound.isPlaying) {
        sound.stop();
      }
    });
    const animations = gltf.animations; 

    animations.forEach(clip => {
      const action = mixer.clipAction(clip);
      actions.push(action);
    });

  });
  // Handle resizing
  window.addEventListener('resize', resize, false);
  
  // Start the animation loop
  animate();
}

let wireframeOn = false;

function toggleWireframe() {
  wireframeOn = !wireframeOn;

  loadedModel.traverse((child) => {
    if (child.isMesh) {
      if (Array.isArray(child.material)) {
        child.material.forEach((mat) => {
          mat.wireframe = wireframeOn;
          mat.needsUpdate = true;
        });
      } else {
        child.material.wireframe = wireframeOn;
        child.material.needsUpdate = true;
      }
    }
  });
}

function animate() {
  requestAnimationFrame(animate);

  // Update animations
  if (mixer) {
    mixer.update(clock.getDelta());
  }

  renderer.render(scene, camera);

  const time = clock.getElapsedTime();
  const delta =Math.sin(time)*5;
  if (params.spot.moving){
    lights.spot.position.x = delta;
    lights.spotHelper.update();
  }
}

function resize() {
  const canvas = renderer.domElement;

  const width = canvas.clientWidth || 1000;
  const height = canvas.clientHeight || 600;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height, false);
}

function setCameraView(view) {
  if (!loadedModel) return;

  const box = new THREE.Box3().setFromObject(loadedModel);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = maxDim * 1.2;

  if (view === "front") {
    camera.position.set(center.x, center.y + maxDim * 0.3, center.z + distance);
  }

  if (view === "side") {
    camera.position.set(center.x + distance, center.y + maxDim * 0.3, center.z);
  }

  if (view === "top") {
    camera.position.set(center.x, center.y + distance, center.z + 0.01);
  }

  camera.lookAt(center);
  camera.updateProjectionMatrix();
}
