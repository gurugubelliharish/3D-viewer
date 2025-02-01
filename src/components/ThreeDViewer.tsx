import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GUI } from "lil-gui";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry";
import Stats from "three/examples/jsm/libs/stats.module";

const ThreeDViewer: React.FC = () => {
  let mesh: any;
  let line: THREE.Line;
  let scene: THREE.Scene;
  let camera: THREE.Camera;
  let stats: Stats;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const raycaster = new THREE.Raycaster();
  const [fileURL, setFileURL] = React.useState<string | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetchFile();
  }, []);

  React.useEffect(() => {
    init();
    return () => {
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, [fileURL]);

  const fetchFile = async () => {
    try {
      const response = await fetch("../Assets/models/LeePerrySmith.glb");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const file = await response.blob();
      const blobURL = URL.createObjectURL(file); // Create a Blob URL
      setFileURL(blobURL);
    } catch (error) {
      console.error("Error fetching the file:", error);
    }
  };
  const intersection = {
    intersects: false,
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
  };
  const mouse = new THREE.Vector2();
  const intersects: THREE.Intersection[] = [];

  const textureLoader = new THREE.TextureLoader();
  const decalDiffuse = textureLoader.load(
    "https://threejs.org/examples/textures/decal/decal-diffuse.png"
  );
  decalDiffuse.colorSpace = THREE.SRGBColorSpace;
  const decalNormal = textureLoader.load(
    "https://threejs.org/examples/textures/decal/decal-normal.jpg"
  );

  const decalMaterial = new THREE.MeshPhongMaterial({
    specular: 0x444444,
    map: decalDiffuse,
    normalMap: decalNormal,
    normalScale: new THREE.Vector2(1, 1),
    shininess: 30,
    transparent: true,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    wireframe: false,
  });

  const decals: THREE.Mesh[] = [];
  let mouseHelper: THREE.Mesh;
  const position = new THREE.Vector3();
  const orientation = new THREE.Euler();
  const size = new THREE.Vector3(10, 10, 10);

  const params = {
    minScale: 10,
    maxScale: 20,
    rotate: true,
    clear: function () {
      removeDecals();
    },
  };

  function init() {
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    mountRef.current?.appendChild(renderer.domElement);

    stats = new Stats();
    mountRef.current?.appendChild(stats.dom);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    camera.position.z = 120;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 50;
    controls.maxDistance = 200;

    scene.add(new THREE.AmbientLight(0x666666));

    const dirLight1 = new THREE.DirectionalLight(0xffddcc, 3);
    dirLight1.position.set(1, 0.75, 0.5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xccccff, 3);
    dirLight2.position.set(-1, 0.75, -0.5);
    scene.add(dirLight2);

    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);

    line = new THREE.Line(geometry, new THREE.LineBasicMaterial());
    scene.add(line);

    loadLeePerrySmith();

    mouseHelper = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 10),
      new THREE.MeshNormalMaterial()
    );
    mouseHelper.visible = false;
    scene.add(mouseHelper);

    window.addEventListener("resize", onWindowResize);

    let moved = false;

    controls.addEventListener("change", function () {
      moved = true;
    });

    window.addEventListener("pointerdown", function () {
      moved = false;
    });

    window.addEventListener("pointermove", onPointerMove);

    function onPointerMove(event: PointerEvent) {
      if (event.isPrimary) {
        checkIntersection(event.clientX, event.clientY);
      }
    }

    function checkIntersection(x: number, y: number) {
      if (mesh === undefined) return;

      mouse.x = (x / window.innerWidth) * 2 - 1;
      mouse.y = -(y / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      raycaster.intersectObject(mesh, false, intersects);

      if (intersects.length > 0 && intersects[0].face) {
        const p = intersects[0].point;
        mouseHelper.position.copy(p);
        intersection.point.copy(p);

        const n = intersects[0].face.normal.clone();
        n?.transformDirection(mesh.matrixWorld);
        n?.multiplyScalar(10);
        n?.add(intersects[0].point);

        intersection.normal.copy(intersects[0].face.normal);
        mouseHelper.lookAt(n);

        const positions = line.geometry.attributes.position;
        positions.setXYZ(0, p.x, p.y, p.z);
        positions.setXYZ(1, n.x, n.y, n.z);
        positions.needsUpdate = true;

        intersection.intersects = true;

        intersects.length = 0;
      } else {
        intersection.intersects = false;
      }
    }

    const gui = new GUI();

    gui.add(params, "minScale", 1, 30);
    gui.add(params, "maxScale", 1, 30);
    gui.add(params, "rotate");
    gui.add(params, "clear");
    gui.open();
  }

  function loadLeePerrySmith() {
    const map = textureLoader.load(
      "https://threejs.org/examples/models/gltf/LeePerrySmith/Map-COL.jpg"
    );
    map.colorSpace = THREE.SRGBColorSpace;
    const specularMap = textureLoader.load(
      "https://threejs.org/examples/models/gltf/LeePerrySmith/Map-SPEC.jpg"
    );
    const normalMap = textureLoader.load(
      "https://threejs.org/examples/models/gltf/LeePerrySmith/Infinite-Level_02_Tangent_SmoothUV.jpg"
    );

    const loader = new GLTFLoader();

    loader.load(
      "https://threejs.org/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb",
      function (gltf) {
        mesh = gltf.scene.children[0];
        mesh.material = new THREE.MeshPhongMaterial({
          specular: 0x111111,
          map: map,
          specularMap: specularMap,
          normalMap: normalMap,
          shininess: 25,
        });

        scene.add(mesh);
        mesh.scale.set(10, 10, 10);
      }
    );
  }

  function removeDecals() {
    decals.forEach(function (d) {
      scene.remove(d);
    });

    decals.length = 0;
  }

  function onWindowResize() {
    camera.clear();

    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate() {
    renderer.render(scene, camera);

    stats.update();
  }

  return <div ref={mountRef}></div>;
};

export default ThreeDViewer;
