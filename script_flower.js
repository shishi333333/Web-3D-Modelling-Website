var scene, camera, renderer, clock, mixer, actions = [], mode, isWireframe=false, params, lights;
let loadedModel;
let sound;
let soundReady = false;
let pollenGroup;
let pollenVisible = false;

init();

function init() {
  const assetPath = '../assets/'; // Path to assets
  
    clock = new THREE.Clock();
    
    // Create the scene
    scene = new THREE.Scene();

    
    
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load('./assets/images/ffcanvas.jfif', function(texture) {
        scene.background = texture;
    });
    
    // Set up the camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 8);
    //camera.position.set(-5, 25, 20);


    // Add lighting
    const ambient = new THREE.HemisphereLight(0xffffff, 0x444444, 0.35);
    scene.add(ambient);

    lights = {};

      lights.spot = new THREE.SpotLight(0xffffff, 0.7);
      lights.spot.visible = true;
      lights.spot.position.set(3, 6, 5);
      lights.spotHelper = new THREE.SpotLightHelper(lights.spot);
      lights.spotHelper.visible = false;
      scene.add(lights.spotHelper);
      scene.add(lights.spot);

      params = {
        spot: {
          enable: false,
          color: 0xffffff,
          distance: 15,
          angle: Math.PI/5,
          penumbra: 0.6,
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
      spot.add(params.spot, 'helper').onChange(value => lights.spotHelper.visible = value);
      spot.add(params.spot, 'moving');
    
    const light = new THREE.DirectionalLight(0xFFFFFF, 2);
    light.position.set(0, 10, 2);
    scene.add(light);
    
    // Set up the renderer
    const canvas = document.getElementById('threeContainer');
    console.log("Canvas found:", canvas);

    if (!canvas) {
      throw new Error("Canvas not found");
    }
   
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    
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
  audioLoader.load('./assets/audio/petals.mp3', function(buffer){
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
    if (actions.length >= 0) {
      if (mode === "open") {
        actions.forEach(action => {
          action.timeScale = 1;
          action.reset();
          
          action.setLoop(THREE.LoopRepeat, 2);

          
          action.clampWhenFinished = true;

          action.timeScale = 0.7;
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
      const axis = new THREE.Vector3(0, 0, 1);
      const angle  = Math.PI /8;
      loadedModel.rotateOnAxis(axis, angle);

    }
    else{
      console.warn('Model not loaded yet');
    }
  })
  
  // Load the glTF model
  const loader = new THREE.GLTFLoader();
  loader.load('./assets/models/petals2.glb', function(gltf) {
    const model = gltf.scene;
    // making the model bigger
    model.scale.set(1.2, 1.2, 1.2);
    model.position.set(0, 0, 0);
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

    gltf.animations.forEach(clip => {
      const action = mixer.clipAction(clip);
      actions.push(action);
    });
    
    createPollen();

  });
  // Handle resizing
  window.addEventListener('resize', resize, false);
  
  // Start the animation loop
  animate();
}

function toggleWireframe(enable) {

  loadedModel.traverse((object) => {
    if (!object.isMesh) return;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    materials.forEach((mat) => {

      if (!mat.userData.saved) {
        mat.userData.originalColor = mat.color ? mat.color.clone() : null;
        mat.userData.originalMap = mat.map || null;
        mat.userData.originalWireframe = mat.wireframe;
        mat.userData.saved = true;
      }

      if (enable) {
        mat.map = null;

        if (mat.color) {
          mat.color.set(0xd3d3d3);
        }

        mat.wireframe = true;

      } else {

        mat.map = mat.userData.originalMap;

        if (mat.color && mat.userData.originalColor) {
          mat.color.copy(mat.userData.originalColor);
        }

        mat.wireframe = mat.userData.originalWireframe;
      }

      mat.needsUpdate = true;
    });
  });
}

function animate() {
  requestAnimationFrame(animate);

  // Update animations
  if (mixer) {
    mixer.update(clock.getDelta());
  }

  if (pollenGroup && pollenVisible) {
    pollenGroup.rotation.y += 0.001;
    pollenGroup.children.forEach((particle, index) => {

      particle.position.y += Math.sin(
        clock.getElapsedTime() + index
      ) * 0.0005;

    });
  }

  renderer.render(scene, camera);
  const time = clock.getElapsedTime();
  const delta =Math.sin(time)*5;
  if (params.spot.moving && lights.spotHelper){
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

// Pollen animation
const pollenBtn = document.getElementById("togglePollen");

pollenBtn.addEventListener('click', function(){

  if (!pollenGroup) return;

  pollenVisible = !pollenVisible;

  pollenGroup.visible = pollenVisible;
});

function createPollen() {
  pollenGroup = new THREE.Group();

  const geometry = new THREE.SphereGeometry(0.025, 8, 8);
  const material = new THREE.MeshBasicMaterial({
    color: 0xfff8e7
  });

  for (let i = 0; i < 40; i++) {
    const pollen = new THREE.Mesh(geometry, material);

    pollen.position.set(
      (Math.random() - 0.5) * 8,
      Math.random() * 5,
      (Math.random() - 0.5) * 6
    );

    pollenGroup.add(pollen);
  }

  pollenGroup.visible = false;

  scene.add(pollenGroup);
}

function setCameraView(view) {
  if (view === "side") camera.position.set(-8, 4, 8);
  if (view === "top") camera.position.set(0, 12, 0.1);
  if (view === "tilt") camera.position.set(6, 7, 6);

  camera.lookAt(0, 0, 0);
}