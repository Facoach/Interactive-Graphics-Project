import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as TWEEN from '@tweenjs/tween.js';

// --- CONFIGURAZIONE GLOBALE ---
let scene, camera, renderer, player, textureLoader;
let sunLight; // Luce direzionale (Il "Sole")
const keys = { w: false, a: false, s: false, d: false, shift: false };
let velocityY = 0;
const gravity = -0.01;
const jumpForce = 0.2;
let isJumping = false;
let platforms = [];
let walls = [];
let door;
let starMaterial;
let planet, planet2, planet3, planet4;
let sunMesh;
let sunPivot1, sunPivot2, sunPivot3, sunPivot4; // 4 perni separati per i 4 pianeti
let sunPointLight;
let solarFlares;
let moonPivot, moon;
let crystal1, crystal2;
let leftArm, rightArm, leftLeg, rightLeg;
let s1, s2;
let wireMaterial;
let buttonSwitch; // L'oggetto 3D
let interactLight; // La luce che attiveremo
let isLightOn = false; // Stato della luce
let luce; //interactive light
let playerGlow; // Luce soffusa intorno al player
let playerLamp; // La torcia del giocatore
let isLampOn = false; 
let sensors = []; // Array per gestire più sensori

let doorTween = null;
let isDoorOpen = false; // Serve a capire se la porta è già in transizione o aperta

let movingButton = null;
let buttonInitialPos = null;
let isButtonAnimating = false; // Impedisce lo spam del tasto F durante il movimento

let blackHoleGroup, accretionDisk;
let galaxy;


const promptUI = document.getElementById('interaction-prompt');

// Funzione Init
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020205);

    // Texture Loader (Project 3)
    textureLoader = new THREE.TextureLoader();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; 
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Ombre più morbide (Slide 16)
    document.body.appendChild(renderer.domElement);

    createLights();
    createWorld();
    createSciFiCable();
    setupEventListeners();
    const starField = createStars();
    
    animate();
}

function createStars() {
    const starGeometry = new THREE.BufferGeometry();
    starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.1, // Grandezza delle stelle
        transparent: true,
        opacity:1
    });

    const starVertices = [];
    for (let i = 0; i < 3200; i++) {
        // Creiamo posizioni casuali in un raggio molto ampio (es. tra -500 e 500)
        const x = (Math.random() - 0.5) * 500;
        const y = (Math.random() - 0.5) * 500;
        const z = (Math.random() - 0.5) * 500;
        //Escludiamo le stelle troppo vicine alla stanza
        if (x > -50 && x < 50 && y > -200 && y < 50 && z > -50 && z < 50) {
        } else{
            starVertices.push(x, y, z);
        }
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);
    
    return stars; // Lo restituiamo se vogliamo farlo ruotare dopo
}

function createGalaxy() {
    const particleCount = 15000; // Numero di stelle nella galassia
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    // Parametri della galassia
    const arms = 3;             // Numero di bracci della spirale
    const galaxyRadius = 80;    // Raggio della galassia
    const coreColor = new THREE.Color('#ffe6aa'); // Centro caldo (giallo/bianco)
    const armColor = new THREE.Color('#ff00aa');  // Bracci freddi (viola/magenta)

    for (let i = 0; i < particleCount; i++) {
        // 1. POSIZIONE
        // Distanza dal centro (più stelle vicino al centro, meno fuori)
        const radius = Math.random() * galaxyRadius * Math.pow(Math.random(), 2);
        
        // Calcolo dell'angolo per creare l'effetto spirale (Bracci)
        const armAngle = ((i % arms) / arms) * Math.PI * 2;
        const spinAngle = radius * 0.1; // Determina quanto si "avvolge" la spirale

        // Casualità per dare spessore ai bracci (effetto nuvola)
        const randomX = (Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1)) * (radius * 0.1);
        const randomY = (Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1)) * (radius * 0.05); // Più piatta sull'asse Y
        const randomZ = (Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1)) * (radius * 0.1);

        const i3 = i * 3;
        positions[i3]     = Math.cos(armAngle + spinAngle) * radius + randomX;
        positions[i3 + 1] = randomY; // Altezza della galassia
        positions[i3 + 2] = Math.sin(armAngle + spinAngle) * radius + randomZ;

        // 2. COLORE (Sfumatura dal nucleo ai bracci)
        const mixedColor = coreColor.clone();
        // Sfumiamo tra il colore del nucleo e quello dei bracci in base alla distanza
        mixedColor.lerp(armColor, radius / galaxyRadius);

        colors[i3]     = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Materiale delle singole stelle della galassia
    const material = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true, // Dice a Three.js di usare i colori calcolati sopra
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending, // Illumina fondendo le particelle al centro
        depthWrite: false, // Impedisce alle particelle di coprirsi a vicenda con quadrati neri
        fog: false // Non viene cancellata dalla nebbia di gioco
    });

    galaxy = new THREE.Points(geometry, material);
    
    // Posizioniamo la galassia LONTANISSIMA nel cielo
    // Scegli coordinate molto grandi (es. x: 500, y: 300, z: -600)
    galaxy.position.set(-800, 400, -400);
    
    // Ruotiamola leggermente per vederla "di taglio/in diagonale" (più suggestiva)
    galaxy.rotation.x = 0.6;
    galaxy.rotation.z = 0.2;

    scene.add(galaxy);
}

// --- LOGICA DI ILLUMINAZIONE FISICA ---
function getIntensityOnObject(lightSource, targetObj) {
    const lightPos = new THREE.Vector3();
    lightSource.getWorldPosition(lightPos);
    const targetPos = new THREE.Vector3();
    targetObj.getWorldPosition(targetPos);

    const dist = lightPos.distanceTo(targetPos);
    if (dist > 20) return 0; // Ottimizzazione: se troppo lontano, scarta subito

    let intensity = lightSource.intensity / (dist * dist);

    if (lightSource.isSpotLight) {
        const lampDir = new THREE.Vector3(0, 0, -1).applyQuaternion(player.quaternion);
        const dirToTarget = new THREE.Vector3().subVectors(targetPos, lightPos).normalize();
        const dot = lampDir.dot(dirToTarget);
        
        if (dot < Math.cos(lightSource.angle)) return 0;
        
        const penumbraMod = Math.pow(
            (dot - Math.cos(lightSource.angle)) / (1 - Math.cos(lightSource.angle)), 
            lightSource.penumbra * 10
        );
        intensity *= penumbraMod;
    }

    const rayDir = new THREE.Vector3().subVectors(targetPos, lightPos).normalize();
    const raycaster = new THREE.Raycaster(lightPos, rayDir, 0, dist + 0.5);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0 && intersects[0].object !== targetObj && intersects[0].object.parent !== targetObj) {
        return 0;
    }

    return intensity;
}

// --- AGGIORNAMENTO STATI ---
function updateSensors() {
    sensors.forEach(sensor => {
        const crystal = sensor.getObjectByName("Crystal");
        if (!crystal) return;

        // PASSIAMO IL CRYSTAL, NON IL SENSOR
        const i1 = isLampOn ? getIntensityOnObject(playerLamp, crystal) : 0;
        const i2 = isLightOn ? getIntensityOnObject(interactLight, crystal) : 0;
        
        if (i1 + i2 > 0.1) {
            sensor.userData.activated = true;
        } else {
            sensor.userData.activated = false;
        }

        if (sensor.userData.activated) {
            crystal.rotation.y += 0.04;
        }
    });
    updateDoor();
}

function updateSpecialPlatforms() {
    platforms.forEach(plat => {
        if (plat.userData.type === 'normal') return;

        const i1 = isLampOn ? getIntensityOnObject(playerLamp, plat) : 0;
        const i2 = isLightOn ? getIntensityOnObject(interactLight, plat) : 0;
        const i3 = isLampOn ? getIntensityOnObject(playerGlow, plat) : 0;
        const isHitByLight = (i1 + i2 + i3) > 0.14;

        if (plat.userData.type === 'shadow') {
            plat.visible = !isHitByLight;
            plat.userData.active = !isHitByLight;
            if (!isHitByLight) plat.material.emissiveIntensity = 1.0;
        } 
        else if (plat.userData.type === 'light-only') {
            plat.visible = isHitByLight;
            plat.userData.active = isHitByLight;
            plat.material.opacity = isHitByLight ? 1.0 : 0;
        }
    });
}

function updateDoor() {
    if (!door) return; // Sicurezza: se la porta non è ancora caricata, non fare nulla

    // Controlliamo se TUTTI i sensori sono attivi
    const allActivated = sensors.every(s => s.userData.activated);

    // Entriamo nell'IF solo se lo stato attuale dei sensori è DIVERSO dallo stato della porta
    if (allActivated !== isDoorOpen) {
        isDoorOpen = allActivated; // Aggiorna lo stato della porta

        // Se c'era già un movimento in corso, lo stoppiamo per evitare scatti energetici
        if (doorTween) doorTween.stop();

        // Stabiliamo l'altezza Y finale (7 se aperta, 2 se chiusa perché h/3 del tuo muro è uguale a 2)
        const targetY = isDoorOpen ? 7 : 2;

        // Creiamo il movimento fluido
        doorTween = new TWEEN.Tween(door.position)
            .to({ y: targetY }, 1500) // 1500 millisecondi = 1.5 secondi di durata del movimento
            .easing(TWEEN.Easing.Cubic.InOut) // Inizia lento, accelera, decelera alla fine (molto cinematico)
            .start(); // Avvia il tween
    }
}

function createSciFiCable() {
    // Definiamo i punti di snodo del cavo per farlo sembrare agganciato alle pareti
    const points = [
        new THREE.Vector3(0, 0.25, 9.4),     // 1. Parte dal retro del bottone
        new THREE.Vector3(0, 0.5, 9.5),     // 2. Scende subito al pavimento
        new THREE.Vector3(0, 0.5, 9.0),    // 3. Va dritto verso il muro posteriore
        new THREE.Vector3(-9.3, 0.5, 9.0), // 4. Segue la linea del muro fino all'angolo sinistro
        new THREE.Vector3(-9.7, 2.5, 2.0),    // 5. Cammina sul pavimento fino a trovarsi sotto la luce
        new THREE.Vector3(-10, 5.5, 0),     // 6. Sale dritto sul muro fino all'altezza della lampada
    ];

    // Creiamo una curva morbida che unisce questi punti
    const cableCurve = new THREE.CatmullRomCurve3(points);

    // Generiamo la geometria del tubo: (curva, segmenti, raggio del cavo, segmenti radiali, chiuso)
    // Un raggio di 0.04 lo rende un cavo sottile ma ben visibile
    const cableGeometry = new THREE.TubeGeometry(cableCurve, 128, 0.04, 8, false);

    // Creiamo il materiale standard con proprietà emissive (per farlo illuminare)
    wireMaterial = new THREE.MeshStandardMaterial({
        color: 0x15151c,           // Colore base del cavo (un grigio scuro/nero plastica)
        roughness: 0.6,
        metalness: 0.2,
        emissive: 0x000000,        // All'inizio il bagliore è SPENTO (nero)
        emissiveIntensity: 2.0     // Intensità del bagliore quando si accenderà
    });

    const cableMesh = new THREE.Mesh(cableGeometry, wireMaterial);
    cableMesh.castShadow = true;
    cableMesh.receiveShadow = true;

    scene.add(cableMesh);
}

// --- 2. LUCI E OMBRE DINAMICHE (Project 4) ---
function createLights() {
    // Luce ambientale minima per vedere i contorni
    const ambient = new THREE.AmbientLight(0xffffff, 0.1); 
    scene.add(ambient);

    // Sole: lo teniamo solo come "luce lunare" senza ombre per non creare confusione
    sunLight = new THREE.DirectionalLight(0x4444ff, 0.1); 
    sunLight.position.set(10, 20, 10);
    sunLight.castShadow = false; // DISABILITA OMBRE SOLE
    scene.add(sunLight);
}

// --- 3. MONDO, TEXTURE E PIATTAFORME (Project 3) ---
function createWorld() {
    const loader = new GLTFLoader();

    // --- TEXTURES ---
    const floorTex = textureLoader.load('./textures/floor.png');
    const wallTex = textureLoader.load('./textures/wall_texture.jpg');
    const doorTex = textureLoader.load('./textures/door.png');
    wallTex.wrapS = THREE.RepeatWrapping;
    wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(1, 1);
    doorTex.wrapS = THREE.RepeatWrapping;
    doorTex.wrapT = THREE.RepeatWrapping;
    doorTex.repeat.set(1, 1);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(4, 4);

    // --- STANZA PRINCIPALE (Pavimento come Piattaforma) ---
    // Posizioniamo il pavimento a Y=0. Con altezza 0.5, la superficie calpestabile è a Y=0.25
    addPlatform(0, 0, 0, 20, 20, floorTex);

    // --- 2. MURI (Usiamo addWall) ---
    const h = 6; // altezza
    const t = 1; // spessore
    addWall(-10.5, h/2, 0, t, h, 20, 0xffffff, wallTex);      // Sinistra
    addWall(10.5, h/2, 0, t, h, 20, 0xffffff, wallTex);       // Destra
    addWall(0, h/2, 10.5, 22, h, t, 0xffffff, wallTex);      // Dietro
    addWall(-7, h/2, -10.5, 8, h, t, 0xffffff, wallTex);     // Davanti sx
    addWall(7, h/2, -10.5, 8, h, t, 0xffffff, wallTex);      // Davanti dx
    addWall(0, 5, -10.5, 6, 2, t, 0xffffff, wallTex);        // Trave sopra porta

    // --- PORTA ---
    door = addWall(0, h/3, -10.5, 6, h, 0.4, 0x442200, doorTex);

    // --- SENSORI E INTERRUTTORI (Posizioni regolate) ---
    loader.load('./models/Untitled.glb', (gltf) => {
        s1 = gltf.scene;
    
        // Configurazione Modello
        s1.scale.set(0.01,0.01,0.01);  

        // Rendiamo il modello capace di proiettare ombre
        s1.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        const crystal = s1.getObjectByName("Crystal");
        crystal1 = crystal;

        // --- 1. CARICAMENTO TEXTURE ---
        const crystalTex = textureLoader.load('./textures/crystal.png');

        crystal.material = new THREE.MeshStandardMaterial({
            map: crystalTex,            // La texture sulle facce
            emissiveMap: crystalTex,
            color: 0xffffff,           // Colore base (moltiplicatore della texture)
            emissive: 0x00ffff,        // Colore del bagliore (es. Ciano/Azzurro)
            emissiveIntensity: 0.7,    // Intensità del bagliore (0 = spento)
            metalness: 0.5,            // Opzionale: rende il cristallo più riflettente
            roughness: 0.2,            // Opzionale: lo rende più lucido
            opacity: 0.9
        });

        if (crystal) {
            // Creiamo i bordi basandoci sulla geometria del cristallo
            const edges = new THREE.EdgesGeometry(crystal.geometry);
            const lineMat = new THREE.LineBasicMaterial({ 
                color: 0x004444, // Un azzurro/verde molto scuro
                linewidth: 2     // Nota: su Windows lo spessore è spesso fisso a 1
            });
            const wireframe = new THREE.LineSegments(edges, lineMat);
        
            // Aggiungiamo i bordi come figli del cristallo così si muovono insieme
            crystal.add(wireframe);


        }

        s1.rotation.y = -Math.PI/2; 
        s1.position.set(9, 1, 0);
        s1.userData = { activated: false };
        sensors.push(s1);
        scene.add(s1);
        console.log("Modello caricato correttamente");
    }, undefined, (error) => {
        console.error("Errore nel caricamento del modello:", error);
    });


    loader.load('./models/Untitled.glb', (gltf) => {
        s2 = gltf.scene;
    
        // Configurazione Modello
        s2.scale.set(0.01,0.01,0.01); 

        // Rendiamo il modello capace di proiettare ombre
        s2.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        const crystal = s2.getObjectByName("Crystal");
        crystal2 = crystal;

        // --- 1. CARICAMENTO TEXTURE ---
        const crystalTex = textureLoader.load('./textures/crystal.png');

        crystal.material = new THREE.MeshStandardMaterial({
            map: crystalTex,            // La texture sulle facce
            emissiveMap: crystalTex,
            color: 0xffffff,           // Colore base (moltiplicatore della texture)
            emissive: 0x00ffff,        // Colore del bagliore (es. Ciano/Azzurro)
            emissiveIntensity: 0.7,    // Intensità del bagliore (0 = spento)
            metalness: 0.5,            // Opzionale: rende il cristallo più riflettente
            roughness: 0.2,            // Opzionale: lo rende più lucido
            opacity: 0.9
        });
        
        if (crystal) {
            // Creiamo i bordi basandoci sulla geometria del cristallo
            const edges = new THREE.EdgesGeometry(crystal.geometry);
            const lineMat = new THREE.LineBasicMaterial({ 
                color: 0x004444, // Un azzurro/verde molto scuro
                linewidth: 2     // Nota: su Windows lo spessore è spesso fisso a 1
            });
            const wireframe = new THREE.LineSegments(edges, lineMat);
        
            // Aggiungiamo i bordi come figli del cristallo così si muovono insieme
            crystal.add(wireframe);

            // Rendiamo il materiale del cristallo un po' trasparente

        }

        s2.rotation.y = Math.PI /2; 
        s2.position.set(-9, 1, 0);
        s2.userData = { activated: false };
        sensors.push(s2);
        scene.add(s2);
        console.log("Modello caricato correttamente");
    }, undefined, (error) => {
        console.error("Errore nel caricamento del modello:", error);
    });

    //bottone
    loader.load('./models/scifi_button.glb', (gltf) => {
        buttonSwitch = gltf.scene;
    
        // Configurazione Modello
        buttonSwitch.scale.set(1, 1, 1); 

        // Rendiamo il modello capace di proiettare ombre
        buttonSwitch.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        movingButton = buttonSwitch.getObjectByName('button');

        if (movingButton) {
            // Salviamo la posizione locale iniziale (sarà il nostro punto di partenza e ritorno)
            buttonInitialPos = movingButton.position.clone();
        }

        buttonSwitch.rotation.y = Math.PI;
        buttonSwitch.position.set(0, 0.25, 9.3);
        scene.add(buttonSwitch);
        console.log("Modello caricato correttamente");
    }, undefined, (error) => {
        console.error("Errore nel caricamento del modello:", error);
    });

    //luce interattiva
    interactLight = new THREE.PointLight(0xffaa00, 0, 15, 2);
    interactLight.position.set(-9, 5.5, 0);
    interactLight.castShadow = true;
    interactLight.shadow.bias = -0.005; // Fondamentale per eliminare le righe nere
    interactLight.shadow.mapSize.width = 1024; // Opzionale: migliora la qualità
    interactLight.shadow.mapSize.height = 1024;
    scene.add(interactLight);

    loader.load('./models/scifi_prop_-_alert_lamp.glb', (gltf) => {
        luce = gltf.scene;
    
        // Configurazione Modello
        luce.scale.set(2, 2, 2); 

        // Rendiamo il modello capace di proiettare ombre
        luce.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        luce.rotation.y = Math.PI /2;
        luce.position.set(-9.9, 5.5, 0);
        scene.add(luce);
        console.log("Modello caricato correttamente");
    }, undefined, (error) => {
        console.error("Errore nel caricamento del modello:", error);
    });

    // --- PLAYER (Posizionato sopra il nuovo pavimento) ---
    player = new THREE.Group();
    player.position.set(0, 2, 5); 
    scene.add(player);

    // Caricamento Modello 3D
    loader.load('./models/small_robot_corrected.glb', (gltf) => {
        const model = gltf.scene;
    
        // Configurazione Modello
        model.scale.set(1, 1, 1); 
    
        // Posizioniamo i piedi del modello alla base del gruppo (y=0 del gruppo)
        model.position.y = 0.7; 

        // Rendiamo il modello capace di proiettare ombre
        model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                // Rende le superfici lisce eliminando l'effetto "a quadratini"
                node.geometry.computeVertexNormals();

                if (node.name.includes("arm_l")) {
                    leftArm = node;
                }
                if (node.name.includes("arm_r")) {
                    rightArm = node;
                }
                if (node.name.includes("leg_l")) {
                    leftLeg = node;
                }
                if (node.name.includes("leg_r")) {
                    rightLeg = node;
                }
                    
            }
        });
        model.rotation.y = Math.PI;
        player.add(model);
        console.log("Modello caricato correttamente");
    }, undefined, (error) => {
        console.error("Errore nel caricamento del modello:", error);
    });
    player.add(camera);
    camera.position.set(0, 2, 5);

    // ... Torcia e Glow rimangono invariati ...
    playerLamp = new THREE.SpotLight(0xffffff, 0, 30, Math.PI / 4, 0.3, 2);
    playerLamp.position.set(0, 0.5, -0.5);
    playerLamp.castShadow = true;
    playerLamp.shadow.bias = -0.005; // Fondamentale per eliminare le righe nere
    playerLamp.shadow.mapSize.width = 1024; // Opzionale: migliora la qualità
    playerLamp.shadow.mapSize.height = 1024;
    player.add(playerLamp);
    const lampTarget = new THREE.Object3D();
    lampTarget.position.set(0, 0.5, -5);
    player.add(lampTarget);
    playerLamp.target = lampTarget;
    playerGlow = new THREE.PointLight(0xffffff, 0, 4, 2);
    playerGlow.position.set(0, -0.5, 0);
    player.add(playerGlow);

    // --- PERCORSO ESTERNO ---
    addPlatform(0, 0, -16, 4, 4, floorTex); // Prima piattaforma fuori
    addPlatform(0, 0.5, -22, 3, 3, null, false, 'shadow');
    addPlatform(0, 1, -28, 3, 3, floorTex);
    addPlatform(0, 1.5, -35, 3, 3, floorTex, true);
    platforms[platforms.length - 1].userData.moveAxis = 'x';
    platforms[platforms.length - 1].userData.startX = 0;
    addPlatform(5, 2, -42, 2, 2, floorTex, false, 'light-only');
    addPlatform(0, 2.5, -50, 6, 6, floorTex);


    // --- IL SOLE ---

    // Posizioniamo il Sole lontano nel cielo
    const sunPosition = new THREE.Vector3(180, 80, -250); 

    // Geometria più grande (raggio 25) perché è molto distante
    const sunGeo = new THREE.SphereGeometry(25, 32, 32); 
    const sunMat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,           
        emissive: 0xff5500,        
        emissiveIntensity: 2.5,    
        wireframe: false,
        fog: false // Immune alla nebbia
    });
    sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.copy(sunPosition);
    scene.add(sunMesh);

    // 2. Luce del sole
    sunPointLight = new THREE.PointLight(0xffaa00, 2.0, 600); 
    sunPointLight.castShadow = true;
    sunPointLight.shadow.mapSize.width = 2048; 
    sunPointLight.shadow.mapSize.height = 2048;
    sunPointLight.shadow.bias = -0.0001; 
    sunPointLight.shadow.normalBias = 0.002; 
    sunMesh.add(sunPointLight);

    // 3. CREAZIONE DEI PIVOT NELLO STESSO PUNTO DEL SOLE
    sunPivot1 = new THREE.Group();
    sunPivot1.position.copy(sunPosition);
    scene.add(sunPivot1);

    sunPivot2 = new THREE.Group();
    sunPivot2.position.copy(sunPosition);
    scene.add(sunPivot2);

    sunPivot3 = new THREE.Group();
    sunPivot3.position.copy(sunPosition);
    scene.add(sunPivot3);

    sunPivot4 = new THREE.Group();
    sunPivot4.position.copy(sunPosition);
    scene.add(sunPivot4);

    // 2. LE FIAMME SOLARI (Tempesta di particelle)
    const flareGeo = new THREE.BufferGeometry();
    const flareCount = 600; // Quante fiammelle/scintille vuoi
    const flarePositions = new Float32Array(flareCount * 3);

    for(let i = 0; i < flareCount * 3; i += 3) {
        // Matematica per distribuire le particelle casualmente su una sfera
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
    
        // Distanza casuale dal centro (tra la superficie a 25 e l'atmosfera a 29)
        const r = 22.5 + Math.random() * 4; 

        flarePositions[i] = r * Math.sin(phi) * Math.cos(theta);     // Asse X
        flarePositions[i+1] = r * Math.sin(phi) * Math.sin(theta);   // Asse Y
        flarePositions[i+2] = r * Math.cos(phi);                     // Asse Z
    }

    flareGeo.setAttribute('position', new THREE.BufferAttribute(flarePositions, 3));
    const flareMat = new THREE.PointsMaterial({
        color: 0xffaa00,
        size: 0.8,                 // Grandezza delle scintille
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        fog: false
    });
    solarFlares = new THREE.Points(flareGeo, flareMat);
    sunMesh.add(solarFlares); // Agganciamo anche le particelle al sole

    //PLANETS
    loader.load('./models/Planet2.glb', (gltf) => {
        planet2 = gltf.scene;
        planet2.scale.set(5, 5, 5);
        planet2.castShadow = true;
        planet2.receiveShadow = true;

        // Distanza dal sole (es: 150 unità a destra, su un'orbita più larga)
        planet2.position.set(150, -10, -10); 
    
        // Agganciamo il Pianeta 2 al secondo Pivot del sole
        sunPivot2.add(planet2);

        // --- SPOSTIAMO QUI IL CARICAMENTO DELLA LUNA ---
        loader.load('./models/moon.glb', (gltf) => {
            moon = gltf.scene;
            moon.scale.set(0.5, 0.5, 0.5);
            moon.castShadow = true;
            moon.receiveShadow = true;

            // Creiamo il perno della luna
            moonPivot = new THREE.Group();
        
            // IMPORTANTE: Mettiamo il perno della luna a (0,0,0) LOCALI del pianeta
            moonPivot.position.set(0, 0, 0); 
        
            // Allontaniamo la luna dal suo perno
            moon.position.set(2, 0, 0); 
        
            moonPivot.add(moon);
        
            // TRUCCO: Aggiungiamo il perno della luna DENTRO al pianeta 2!
            planet2.add(moonPivot); 
        });
    });

    loader.load('./models/Planet.glb', (gltf) => {
        planet = gltf.scene;
        planet.scale.set(4, 4, 4); 
        // Posizioniamo il pianeta
        planet.position.set(-150, -20, 30);
        // Rendiamo il modello capace di proiettare ombre
        planet.castShadow = true;
        planet.receiveShadow = true;

        //inclinazione asse
        planet.rotation.z = 0.41;
        sunPivot1.add(planet);

        console.log("Modello caricato correttamente");
    }, undefined, (error) => {
        console.error("Errore nel caricamento del modello:", error);
    });

    loader.load('./models/Planet3.glb', (gltf) => {
        planet3 = gltf.scene;
        planet3.scale.set(2, 2, 2); 
        // Posizioniamo il pianeta
        planet3.position.set(-150, 10, 50);
        // Rendiamo il modello capace di proiettare ombre
        planet3.castShadow = true;
        planet3.receiveShadow = true;

        // --- AGGIUNTA DELLA POINTLIGHT VIOLA ---
        // Argomenti: (colore esadecimale, intensità, distanza massima della luce)
        const coreLight = new THREE.PointLight(0x9900ff, 15, 40); 
        // Posizione 0,0,0 significa "esattamente nel centro del pianeta"
        coreLight.position.set(0, 0, 0); 
        // Se vuoi che i frammenti proiettino ombre sui muri o sulla mappa grazie a questa luce:
        coreLight.castShadow = true; 
        // Regoliamo il bilanciamento dell'ombra per evitare artefatti grafici (opzionale ma consigliato)
        coreLight.shadow.bias = -0.002; 
        // Agganciamo la luce direttamente AL PIANETA
        planet3.add(coreLight);

        sunPivot3.add(planet3);

        console.log("Modello caricato correttamente");
    }, undefined, (error) => {
        console.error("Errore nel caricamento del modello:", error);
    });

    loader.load('./models/Planet4.glb', (gltf) => {
        planet4 = gltf.scene;
        planet4.scale.set(4, 4, 4); 
        // Posizioniamo il pianeta
        planet4.position.set(100, 0, 40);
        // Rendiamo il modello capace di proiettare ombre
        planet4.castShadow = true;
        planet4.receiveShadow = true;

        //inclinazione asse
        planet4.rotation.z = 0.41;
        sunPivot4.add(planet4);

        console.log("Modello caricato correttamente");
    }, undefined, (error) => {
        console.error("Errore nel caricamento del modello:", error);
    });

    /*
    loader.load('./models/Reactor.glb', (gltf) => {
        const model = gltf.scene;
    
        // Configurazione Modello
        model.scale.set(1, 1, 1); 

        // Rendiamo il modello capace di proiettare ombre
        model.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });


        model.rotation.y = Math.PI;
        model.position.set(0, 1.5, 0);
        scene.add(model);
        console.log("Modello caricato correttamente");
    }, undefined, (error) => {
        console.error("Errore nel caricamento del modello:", error);
    });
    */

    // --- IL BUCO NERO ---
    blackHoleGroup = new THREE.Group();
    // Posizionalo esattamente sotto la stanza iniziale, molto in profondità
    blackHoleGroup.position.set(0, -200, 0); 

    // 1. L'Orizzonte degli Eventi (La sfera nera del nulla)
    const bhGeo = new THREE.SphereGeometry(40, 32, 32);
    const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const blackHole = new THREE.Mesh(bhGeo, bhMat);
    blackHoleGroup.add(blackHole);

    // 2. Il Disco di Accrescimento (Sistema di Particelle Attivo)
    const particleCount = 10000; // 10.000 frammenti di materia!
    const diskGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const innerRadius = 42; // Appena fuori dalla sfera nera
    const outerRadius = 130; // Fin dove si estende il disco

    // Colori termici: caldissimo al centro, freddo ai bordi
    const hotColor = new THREE.Color(0xffffff); // Bianco/Giallo incandescente
    const coldColor = new THREE.Color(0xaa1100); // Viola profondo

    for (let i = 0; i < particleCount; i++) {
        // Distribuiamo le particelle. La formula "Math.pow" concentra più polvere vicino al centro
        const r = innerRadius + Math.pow(Math.random(), 3) * (outerRadius - innerRadius);
        const theta = Math.random() * Math.PI * 2;

        // Variazione sull'asse Y per dare spessore al disco
        // Più le particelle sono vicine al centro, più il disco è sottile e schiacciato dalla gravità
        const yThickness = (Math.random() - 0.5) * (800 / r); 

        const i3 = i * 3;
        positions[i3] = Math.cos(theta) * r;
        positions[i3 + 1] = yThickness; 
        positions[i3 + 2] = Math.sin(theta) * r;

        // Sfumatura di colore in base alla distanza
        const mixedColor = hotColor.clone();
        mixedColor.lerp(coldColor, (r - innerRadius) / (outerRadius - innerRadius));

        colors[i3] = mixedColor.r;
        colors[i3 + 1] = mixedColor.g;
        colors[i3 + 2] = mixedColor.b;
    }

    diskGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    diskGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const diskMat = new THREE.PointsMaterial({
        size: 0.6,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending, // La luce si somma rendendo il centro abbagliante
        depthWrite: false, // LA MAGIA ANTI-COMPENETRAZIONE! Ora i bordi non "tagliano" la sfera.
        fog: false
    });

    accretionDisk = new THREE.Points(diskGeo, diskMat);
    
    // Incliniamo leggermente l'intero buco nero per un effetto più cinematografico
    blackHoleGroup.rotation.z = 0.2; 
    blackHoleGroup.add(accretionDisk);

    scene.add(blackHoleGroup);

    createGalaxy();
}


function addWall(x, y, z, w, h, d, color = 0x777777, texture = null) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ 
        map: texture, 
        color: texture ? 0xffffff : color 
    });
    
    const wall = new THREE.Mesh(geo, mat);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    wall.receiveShadow = true;

    scene.add(wall);
    walls.push(wall); // Lo aggiungiamo all'array muri
    return wall;
}

// Funzione helper per aggiungere piattaforme
function addPlatform(x, y, z, w, d, texture, isMoving = false, type = 'normal') {
    const geo = new THREE.BoxGeometry(w, 0.5, d);
    let mat;

    if (type === 'shadow') {
        mat = new THREE.MeshStandardMaterial({ 
            color: 0x000000, 
            emissive: 0x0000ff, 
            transparent: true 
        });
    } else if (type === 'light-only') {
        mat = new THREE.MeshStandardMaterial({ 
            map: texture, 
            transparent: true, 
            opacity: 0 // Partiamo da invisibile
        });
    } else {
        mat = new THREE.MeshStandardMaterial({ map: texture });
    }

    const plat = new THREE.Mesh(geo, mat);
    plat.position.set(x, y, z);
    plat.castShadow = true;
    plat.receiveShadow = true;
    // Settaggio iniziale dello stato
    plat.userData = { 
        isMoving: isMoving, 
        startZ: z, 
        time: 0, 
        type: type, 
        active: (type === 'normal' || type === 'shadow') 
    };
    
    // Se è di tipo light-only, la nascondiamo subito
    if (type === 'light-only') plat.visible = false;

    scene.add(plat);
    platforms.push(plat);
}

// --- 4. ANIMAZIONE E LOGICA ---
function animate() {
    requestAnimationFrame(animate);
    const oldPos = player.position.clone();

    TWEEN.update();

    // 2. MOVIMENTO
    let currentSpeed = keys.shift ? 0.25 : 0.12;
    if (keys.w) player.translateZ(-currentSpeed);
    if (keys.s) player.translateZ(currentSpeed);
    if (keys.a) player.translateX(-currentSpeed);
    if (keys.d) player.translateX(currentSpeed);

    if (keys.w || keys.s || keys.a || keys.d) {
        const speed = 0.008; // Velocità dell'oscillazione
        const time = Date.now() * speed;
        const amplitude = 0.5; // Quanto deve oscillare (in radianti)

        // Usiamo Math.sin per creare un movimento avanti e indietro armonico
        if (leftArm) leftArm.rotation.x = Math.sin(time) * amplitude;
        if (rightArm) rightArm.rotation.x = -Math.sin(time) * amplitude; // Invertito
        if (leftLeg) leftLeg.rotation.x = -Math.sin(time) * amplitude;
        if (rightLeg) rightLeg.rotation.x = Math.sin(time) * amplitude; // Invertito
    } else {
        // Quando è fermo, riporta le braccia in posizione naturale (opzionale)
        if (leftArm) leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, 0.1);
        if (rightArm) rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0, 0.1);
        if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, 0.1);
        if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0, 0.1);
    }

    // 3. GRAVITÀ
    velocityY += gravity;
    player.position.y += velocityY;

    // 4. COLLISIONI (Unificate)
    let onObject = false; 

    platforms.forEach(plat => {
        if (plat.userData.active === false) return;

        // Movimento piattaforme (Logica X/Z già discussa)
        if (plat.userData.isMoving) {
            plat.userData.time += 0.02;
            const movement = Math.sin(plat.userData.time) * 3;
            if (plat.userData.moveAxis === 'x') {
                const nextX = (plat.userData.startX || 0) + movement;
                plat.userData.deltaX = nextX - plat.position.x;
                plat.position.x = nextX;
            } else {
                const nextZ = (plat.userData.startZ || 0) + movement;
                plat.userData.deltaZ = nextZ - plat.position.z;
                plat.position.z = nextZ;
            }
        }

        const dX = Math.abs(player.position.x - plat.position.x);
        const dZ = Math.abs(player.position.z - plat.position.z);
        const halfW = plat.geometry.parameters.width / 2 + 0.4;
        const halfD = plat.geometry.parameters.depth / 2 + 0.4;

        if (dX < halfW && dZ < halfD) {
            // Regoliamo i margini di collisione basandoci sull'altezza della geometria
            const pHeight = plat.geometry.parameters.height / 2;
            const topLevel = plat.position.y + pHeight + 0.5; 
            const bottomLevel = plat.position.y - pHeight - 0.5;

            if (player.position.y <= topLevel && player.position.y > plat.position.y && velocityY <= 0) {
                player.position.y = topLevel;
                velocityY = 0;
                onObject = true;
                if (plat.userData.isMoving) {
                    player.position.x += (plat.userData.deltaX || 0);
                    player.position.z += (plat.userData.deltaZ || 0);
                }
            } 
            else if (player.position.y < topLevel && player.position.y > bottomLevel) {
                // COLLISIONE LATERALE (Mura e lati piattaforme)
                player.position.x = oldPos.x;
                player.position.z = oldPos.z;
            }
        }
    });

    // --- B. COLLISIONE MURI (Solo blocco laterale) ---
    walls.forEach(wall => {
        const dX = Math.abs(player.position.x - wall.position.x);
        const dZ = Math.abs(player.position.z - wall.position.z);
        
        const halfW = wall.geometry.parameters.width / 2 + 0.4;
        const halfD = wall.geometry.parameters.depth / 2 + 0.4;
        const h = wall.geometry.parameters.height / 2;

        // Se siamo dentro i confini X e Z del muro E la nostra altezza Y è "dentro" il muro
        if (dX < halfW && dZ < halfD) {
            if (player.position.y < wall.position.y + h + 0.5 && player.position.y > wall.position.y - h - 0.5) {
                player.position.x = oldPos.x;
                player.position.z = oldPos.z;
            }
        }
    });

    isJumping = !onObject;

    // Reset caduta
    if (player.position.y < -10) {
        player.position.set(0, 5, 5);
        velocityY = 0;
    }

    //flicker delle stelle
    const currenttime = Date.now() * 0.001; // Tempo in secondi
    if (starMaterial) {
        // Math.sin oscilla tra -1 e 1. 
        // Con questa formula lo facciamo oscillare tra 0.7 e 1.0
        starMaterial.opacity = 0.85 + Math.sin(currenttime * 3) * 0.4;
    }

    //oscillazione sensori
    if (crystal1) crystal1.position.y = 2 + Math.sin(currenttime) * 17;
    if (crystal2) crystal2.position.y = 2 + Math.sin(currenttime) * 17;


    // 1. Il Sole ruota lentamente su se stesso
    if (sunMesh) {
        sunMesh.rotation.y += 0.0005;

        // Animazione delle fiamme (Le particelle turbinano veloci)
        if (solarFlares) {
            solarFlares.rotation.y -= 0.0015; 
            solarFlares.rotation.x += 0.0008;
        }
    }

    // 2. I due pianeti orbitano attorno al sole a velocità differenti
    if (sunPivot1) {
        sunPivot1.rotation.y += 0.001;  // Pianeta 1 più veloce (orbita interna)
    }
    if (sunPivot2) {
        sunPivot2.rotation.y += 0.0004; // Pianeta 2 più lento (orbita esterna)
    }
    if (sunPivot3) {
        sunPivot3.rotation.y += 0.0005; // Pianeta 3 più lento (orbita esterna)
    }
    if (sunPivot4) {
        sunPivot4.rotation.y += 0.0007; // Pianeta 4 più lento (orbita esterna)
    }

    // 3. I pianeti ruotano sul proprio asse
    if (planet) planet.rotation.y += 0.005;
    if (planet2) planet2.rotation.y += 0.003;
    if (planet3) planet3.rotation.y += 0.008;
    if (planet4) planet4.rotation.y += 0.003;

    // 4. La luna gira attorno al pianeta 2 
    if (moonPivot) {
        moonPivot.rotation.y += 0.015;
    }

    // ROTAZIONE DEL BUCO NERO
    if (accretionDisk) {
        // Estraiamo l'array con le posizioni (X, Y, Z) di tutte le 10.000 particelle
        const positions = accretionDisk.geometry.attributes.position.array;
        
        // Cicliamo attraverso tutte le particelle
        for (let i = 0; i < positions.length; i += 3) {
            const x = positions[i];
            const z = positions[i + 2]; // La Y non la tocchiamo (i + 1)
            
            // 1. Calcoliamo la distanza attuale di questa particella dal centro (Teorema di Pitagora)
            const r = Math.sqrt(x * x + z * z);
            
            // 2. Fisica reale (Keplero): la velocità angolare aumenta DRASTICAMENTE vicino al centro.
            // Il numero 12 è il "moltiplicatore di velocità". Alzalo (es. 20) per renderlo più rapido!
            const speed = 15 / Math.pow(r, 1.5); 
            
            // 3. Matrice di rotazione 2D: calcoliamo la nuova posizione lungo l'orbita
            const cos = Math.cos(-speed); // Il segno meno stabilisce il senso orario/antiorario
            const sin = Math.sin(-speed);
            
            // 4. Aggiorniamo le coordinate X e Z
            positions[i] = x * cos - z * sin;
            positions[i + 2] = x * sin + z * cos;
        }
        
        // 5. Comunichiamo obbligatoriamente alla scheda video che le posizioni sono state modificate
        accretionDisk.geometry.attributes.position.needsUpdate = true;
    }

    //ROTAZIIONE GALASSIA
    if (galaxy) {
        galaxy.rotation.y += 0.0002; // Rotazione impercettibile e maestosa
    }

    // UI
    if (buttonSwitch && player && promptUI) {
        const distanceToButton = player.position.distanceTo(buttonSwitch.position);
        
        if (distanceToButton < 3) {
            promptUI.style.display = 'block'; // Mostra il suggerimento a schermo
        } else {
            promptUI.style.display = 'none';  // Nasconde il suggerimento
        }
    }
    updateSensors();
    updateSpecialPlatforms();
    renderer.render(scene, camera);
}

// --- 5. INPUT (Interazione utente) ---
function setupEventListeners() {
    window.addEventListener('keydown', (e) => {
        //corsa
        if (e.key === 'Shift') keys.shift = true;
        //movimento WASD
        keys[e.key.toLowerCase()] = true;
        
        //salto
        if (e.key === ' ' && !isJumping) {
            velocityY = jumpForce;
            isJumping = true;
        }

        //lampada
        if (e.key.toLowerCase() === 'e') {
            isLampOn = !isLampOn;
            playerLamp.intensity = isLampOn ? 9 : 0;
            playerGlow.intensity = isLampOn ? 5 : 0;
            console.log("Lampada: " + (isLampOn ? "Accesa" : "Spenta"));
        }

        //interazione con oggetti
        if (e.key.toLowerCase() === 'f') {
            // Controlliamo la distanza tra player e bottone
            const distance = player.position.distanceTo(buttonSwitch.position);

            if (distance < 3) { // Se il giocatore è a meno di 3 unità dal bottone

                // --- ANIMAZIONE PREMUTA BOTTONE ---
                if (movingButton && buttonInitialPos && !isButtonAnimating) {
                    isButtonAnimating = true;

                    // Di norma nei modelli 3D inclinati a 45°, muovere Y e Z verso il valore negativo
                    // spinge l'oggetto verso l'interno del suo "body".
                    // NOTA: Se noti che si muove al contrario o di lato, prova a cambiare i segni - con + 
                    // o a modificare solo l'asse 'z' o solo l'asse 'y'.
                    new TWEEN.Tween(movingButton.position)
                        .to({
                            y: buttonInitialPos.y - 0.06, // va leggermente in basso (locale)
                            z: buttonInitialPos.z - 0.06  // va leggermente all'indietro (locale)
                        }, 100) // Durata della discesa (100 millisecondi)
                        .easing(TWEEN.Easing.Cubic.Out)
                        .yoyo(true) // Torna indietro alla posizione iniziale automaticamente
                        .repeat(1)  // Ripete il movimento al contrario (andata + ritorno)
                        .onComplete(() => {
                            isButtonAnimating = false; // Sblocca l'interruttore alla fine del movimento
                        })
                        .start();
                }

                // --- LOGICA DELLA LUCE 
                isLightOn = !isLightOn; // Inverte lo stato
                interactLight.intensity = isLightOn ? 15 : 0; // Accende/Spegne
                if (luce){
                    const alarmLamp = luce.getObjectByName("lamp")
                    if (alarmLamp){
                        if (isLightOn){
                            alarmLamp.material.emissive.setHex(0xff0000); // Rosso
                            alarmLamp.material.emissiveIntensity = 2;
                        } else {
                            alarmLamp.material.emissive.setHex(0x000000); // Nero
                            alarmLamp.material.emissiveIntensity = 2;
                        }
                    }
                }
                console.log("Luce: " + (isLightOn ? "Accesa" : "Spenta"));
            }
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') keys.shift = false;
        keys[e.key.toLowerCase()] = false;
    });
    window.addEventListener('resize', onWindowResize);

    // Blocca il mouse quando si clicca sulla finestra di gioco
    renderer.domElement.addEventListener('click', () => {
        renderer.domElement.requestPointerLock();
    });

    // Ascolta il movimento del mouse
    window.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === renderer.domElement) {
            // Ruota il player sull'asse Y (sinistra/destra)
            player.rotation.y -= e.movementX * 0.002;
            
            // Opzionale: ruota la camera sull'asse X (su/giù)
            camera.rotation.x -= e.movementY * 0.002;
            // Limita la rotazione su/giù per non fare il giro completo
            camera.rotation.x = Math.max(-Math.PI/4, Math.min(Math.PI/4, camera.rotation.x));
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Avvio del progetto
init();
