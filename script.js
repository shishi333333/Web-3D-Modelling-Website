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

    textureLoader.load('./assets/images/newbbb.jfif', function(texture) {
        scene.background = texture;
    });
    
    // Set up the camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 8);
    // camera.position.set(-5, 25, 20);

      const ambient = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
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


      // Main front light
      const frontLight = new THREE.DirectionalLight(0xffffff, 3);
      frontLight.position.set(0, 3, 8); // same side as camera/front
      frontLight.target.position.set(0, 2, 0);
      scene.add(frontLight);
      scene.add(frontLight.target);

      // Top light, weaker
      const topLight = new THREE.DirectionalLight(0xffffff, 1);
      topLight.position.set(0, 8, 2);
      topLight.target.position.set(0, 2, 0);
      scene.add(topLight);
      scene.add(topLight.target);

      // Optional back/rim light
      const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
      backLight.position.set(0, 3, -8);
      backLight.target.position.set(0, 2, 0);
      scene.add(backLight);
      scene.add(backLight.target);
    
    // Set up the renderer
    const canvas = document.getElementById('threeContainer');
    renderer = new THREE.WebGLRenderer({ canvas: canvas });
    renderer.setPixelRatio(window.devicePixelRatio);
    resize();



  // Add OrbitControls
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  // controls.target.set(1, 2, 0);
  controls.update();

  // Audio logic
  const listener = new THREE.AudioListener();
  camera.add(listener);

  sound = new THREE.Audio(listener);

  const audioLoader = new THREE.AudioLoader();
  audioLoader.load('./assets/audio/buzz_bee.mp3', function(buffer){
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
          //action.timeScale = 1;
          action.reset();
          action.timeScale = 0.7;

         
          action.setLoop(THREE.LoopRepeat, 2);

          
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
      const axis = new THREE.Vector3(0, 0, 1);
      const angle  = Math.PI /8;
      loadedModel.rotateOnAxis(axis, angle);

    }
    else{
      console.warn('Model not loaded yet');
    }
  });

  // Switch models
  const playSecondModelAnimationBtn = document.getElementById("playSecondModelAnimation");
  playSecondModelAnimationBtn.addEventListener('click', function () {
  loadModel('./assets/models/beeFly.glb', true);
  });
  
  // Load the glTF model
  const loader = new THREE.GLTFLoader();

  function loadModel(modelPath, autoplay = false) {
    if (loadedModel) {
      scene.remove(loadedModel);
    }

    actions = [];
    mixer = null;

    loader.load(modelPath, function (gltf) {
      const model = gltf.scene;

      model.rotation.x = Math.PI / 2;
      model.rotation.y = 0;
      model.rotation.z = 0;

      model.position.set(0, 0, 0);
      model.scale.set(1, 1, 1);

      scene.add(model);
      loadedModel = model;

      mixer = new THREE.AnimationMixer(model);

      mixer.addEventListener('finished', function () {
        if (sound && sound.isPlaying) {
          sound.stop();
        }
      });


      actions = gltf.animations.map(clip => {
        const action = mixer.clipAction(clip);
        return action;
      });

      if (autoplay && actions.length > 0) {
        actions.forEach(action => {
          action.reset();
          action.setLoop(THREE.LoopRepeat, 2);
          action.clampWhenFinished = true;
          action.timeScale = 0.7;
          action.play();
        });

        if (soundReady) {
          if (sound.isPlaying) sound.stop();
          sound.play();
        }
      }
    });
  }

loadModel('./assets/models/BeeAn4.glb');

  
  // Handle resizing
  window.addEventListener('resize', resize, false);
  
  // Start the animation loop
  animate();
}

function toggleWireframe(enable){
  scene.traverse(function (object){
    if (object.isMesh){

      if (!object.userData.originalMaterial){
          object.userData.originalMaterial = object.material.clone();
        }

      if (enable){
        
        object.material.map = null;
        object.material.color.set(0x111111);
        object.material.wireframe = true;
      }
      else{
        object.material = object.userData.originalMaterial.clone();
        }
        object.material.needsUpdate = true;
      
      
    }

  });

}


function animate() {
  requestAnimationFrame(animate);

  resize();

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
  const width = canvas.clientWidth || 500;
  const height = canvas.clientHeight || 500;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  
}

function setCameraView(view) {
  if (view === "front") camera.position.set(0, 3, 8);
  if (view === "side") camera.position.set(8, 3, 0);
  if (view === "top") camera.position.set(0, 10, 0);

  camera.lookAt(0, 0, 0);
}


