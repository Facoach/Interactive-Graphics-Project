import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as TWEEN from '@tweenjs/tween.js';

// --- CONFIGURAZIONE GLOBALE ---
let scene, camera, renderer, player, textureLoader;
let sunLight; // Luce direzionale (Il "Sole")
const keys = { w: false, a: false, s: false, d: false, shift: false };
let velocityY = 0;
const gravity = -0.01;
const jumpForce = 0.26;
let isJumping = false;
let platforms = [];
let walls = [];
let door;
let doorOriginalY = null;   // Memorizzerà l'altezza esatta della porta chiusa
let starMaterial;
let planet, planet2, planet3, planet4, planet5, planet6; // Modelli dei pianeti
let sunMesh;
let sunPivot1, sunPivot2, sunPivot3, sunPivot4, sunPivot5, binaryPivot; // 5 perni separati per i 5 pianeti
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

let cometOrbitGroup, cometGroup, cometTail;

let holoSystem;

let radarBlip;    // Conterrà l'oggetto 3D del puntino
let blipTimer = 0; // Servirà a gestire il tempo del lampeggio

let scifiConsole = null;             // Conterrà il modello 3D della console
let consoleIndicator = null;         // Il flag visivo (!)
let isConsoleScreenOpen = false;     // Stato della UI aperta/chiusa
let hasInteractedWithConsole = false; // Controlla se è la prima volta che si legge


const promptUI = document.getElementById('interaction-prompt');

// Funzione Init
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020205);

    // Texture Loader (Project 3)
    textureLoader = new THREE.TextureLoader();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; 
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Ombre più morbide (Slide 16)
    document.body.appendChild(renderer.domElement);

    createLights();
    createWorld();
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

function createGalaxy( x, y, z, coreColorInput = '#ffe6aa', armColorInput = '#ff00aa') {
    const particleCount = 15000; // Numero di stelle nella galassia
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    // Parametri della galassia
    const arms = 3;             // Numero di bracci della spirale
    const galaxyRadius = 80;    // Raggio della galassia
    const coreColor = new THREE.Color(coreColorInput); // Centro caldo (giallo/bianco)
    const armColor = new THREE.Color(armColorInput);  // Bracci freddi (viola/magenta)

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
    galaxy.position.set(x, y, z);
    
    // Ruotiamola leggermente per vederla "di taglio/in diagonale" (più suggestiva)
    galaxy.rotation.x = 0.6;
    galaxy.rotation.z = 0.2;

    scene.add(galaxy);
}

// Genera un tavolo olografico fantascientifico
function createHologramTable(x, y, z) {
    const tableGroup = new THREE.Group();
    tableGroup.position.set(x, y, z);

    // 1. La base del tavolo (Cilindro metallico)
    const baseGeo = new THREE.CylinderGeometry(1.5, 2, 1, 16);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.5; // Solleviamo la base
    tableGroup.add(base);

    // 2. Il sistema solare olografico (Gruppo rotante)
    holoSystem = new THREE.Group();
    holoSystem.position.y = 2.5; // Fluttua sopra il tavolo

    // Materiale stile ologramma (Azzurro, trasparente, luminoso e a griglia)
    const holoMat = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        opacity: 0.6, 
        wireframe: true, 
        blending: THREE.AdditiveBlending 
    });

    const sunGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const sun = new THREE.Mesh(sunGeo, holoMat);
    holoSystem.add(sun);

    const planetGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const planet = new THREE.Mesh(planetGeo, holoMat);
    planet.position.set(1.5, 0, 0); // Orbita a distanza
    holoSystem.add(planet);

    const planetGeo2 = new THREE.SphereGeometry(0.15, 7, 8);
    const planet2 = new THREE.Mesh(planetGeo2, holoMat);
    planet2.position.set(-1.0, 0.5, 1); // Orbita a distanza
    holoSystem.add(planet2);

    tableGroup.add(holoSystem);
    scene.add(tableGroup);
}

// Genera un terminale a muro con schermo luminoso
function createWallConsole(x, y, z, rotationY, isMainConsole = false) {
    const consoleGroup = new THREE.Group();
    consoleGroup.position.set(x, y, z);
    consoleGroup.rotation.y = rotationY;

    // 1. La scrivania
    const deskGeo = new THREE.BoxGeometry(3, 1, 1.5);
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9 });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.y = 1;
    consoleGroup.add(desk);

    // 2. Lo schermo luminoso
    const screenGeo = new THREE.PlaneGeometry(2.5, 1.2);
    const screenMat = new THREE.MeshBasicMaterial({ 
        color: 0x00ffaa, 
        transparent: true, 
        opacity: 0.8, 
        side: THREE.DoubleSide 
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 2, -0.6); 
    screen.rotation.x = 0.2;         
    consoleGroup.add(screen);

    scene.add(consoleGroup);

    // --- SE È LA CONSOLE PRINCIPALE, AGGIUNGI L'ESCLAMATIVO ---
    if (isMainConsole) {
        scifiConsole = consoleGroup; // Salviamo il riferimento

        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.font = 'Bold 110px Arial';
        ctx.fillStyle = '#ffcc00';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 15;
        ctx.fillText('!', 64, 64);
        
        const indicatorTexture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: indicatorTexture, depthTest: false });
        consoleIndicator = new THREE.Sprite(spriteMaterial);
        
        // Lo posizioniamo sopra il monitor
        consoleIndicator.scale.set(1.5, 1.5, 1); 
        consoleIndicator.position.set(0, 3.5, 0);
        consoleIndicator.castShadow = false;
        consoleIndicator.receiveShadow = false;
        consoleGroup.add(consoleIndicator);
    }
}

function createWallRadar(x, y, z, rotationY) {
    const radarGroup = new THREE.Group();
    radarGroup.position.set(x, y, z);
    radarGroup.rotation.y = rotationY;

    // Sfondo del radar
    const plateGeo = new THREE.CylinderGeometry(2, 2, 0.1, 32);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.rotation.x = Math.PI / 2; 
    radarGroup.add(plate);

    // Griglia del radar verde incandescente
    const gridGeo = new THREE.CylinderGeometry(1.9, 1.9, 0.02, 32);
    const gridMat = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        wireframe: true, 
        transparent: true, 
        opacity: 0.4 
    });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = 0.06; 
    radarGroup.add(grid);

    // --- NUOVO: IL PUNTINO LAMPEGGIANTE (BLIP) ---
    const blipGeo = new THREE.SphereGeometry(0.06, 16, 16); // Una microsfera
    const blipMat = new THREE.MeshBasicMaterial({ 
        color: 0x33ff33,      // Verde acido molto luminoso
        transparent: true,    // Fondamentale per poter gestire l'opacity nell'animate
        opacity: 0            // Parte invisibile
    });
    radarBlip = new THREE.Mesh(blipGeo, blipMat);
    
    // Lo posizioniamo a Z = 0.08 così sta leggermente DAVANTI alla griglia senza compenetrarsi
    radarBlip.position.set(0, 0, 0.08); 
    radarGroup.add(radarBlip);

    scene.add(radarGroup);
}

function createFloorVent(x, z) {
    const ventGroup = new THREE.Group();
    ventGroup.position.set(x, 0.26, z); // Appena sopra il pavimento calpestabile per evitare sfarfallii (Z-fighting)

    // Cornice della grata
    const frameGeo = new THREE.BoxGeometry(4, 0.02, 4);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    ventGroup.add(frame);

    // Luce arancione industriale che proviene da sotto la grata
    const ventLight = new THREE.PointLight(0xff5500, 0.8, 4);
    ventLight.position.y = 0.5;
    ventGroup.add(ventLight);

    // Sottili barre metalliche interne
    const barGeo = new THREE.BoxGeometry(0.1, 0.03, 3.6);
    const barMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9 });
    
    for (let i = -5; i <= 5; i++) {
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.x = i * 0.3;
        ventGroup.add(bar);
    }

    scene.add(ventGroup);
}

function createMainframe(x, y, z, rotationY) {
    const mainframe = new THREE.Group();
    mainframe.position.set(x, y, z);
    mainframe.rotation.y = rotationY;

    // Mobile del server
    const cabinetGeo = new THREE.BoxGeometry(3, 6, 2);
    const cabinetMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 });
    const cabinet = new THREE.Mesh(cabinetGeo, cabinetMat);
    cabinet.position.y = 3;
    mainframe.add(cabinet);

    // Aggiungiamo qualche linea LED orizzontale di dettagli sul server
    for (let i = 0; i < 5; i++) {
        const ledGeo = new THREE.BoxGeometry(2.4, 0.1, 0.1);
        // Scegliamo un colore casuale tra verde e rosso per i led dei server
        const ledColor = Math.random() > 0.5 ? 0x00ff00 : 0xff0000;
        const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
        const led = new THREE.Mesh(ledGeo, ledMat);
        
        led.position.set(0, 1 + i * 1.1, 1.01); // Posizionati sulla faccia anteriore
        mainframe.add(led);
    }

    scene.add(mainframe);
}

function createCryoPod(x, y, z, rotationY) {
    const podGroup = new THREE.Group();
    podGroup.position.set(x, y, z);
    podGroup.rotation.y = rotationY;

    // 1. LA BASE (Diritta sul pavimento)
    const baseGeo = new THREE.CylinderGeometry(1.5, 1.6, 0.4, 16);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.5 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.2;
    podGroup.add(base);

    // 2. IL GRUPPO INCLINATO (Corpo del pod)
    const tiltedGroup = new THREE.Group();
    tiltedGroup.position.y = 0.4;  // Si appoggia sulla base
    tiltedGroup.rotation.x = -0.25; // Inclinato all'indietro di circa 15 gradi!
    podGroup.add(tiltedGroup);

    // Corpo metallico interno (Cilindro intero)
    const bodyGeo = new THREE.CylinderGeometry(1.1, 1.1, 4.2, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 2.1;
    tiltedGroup.add(body);

    // Vetro anteriore a semicerchio 
    // I parametri extra servono a tagliare il cilindro a metà (da -90° a +90°)
    const glassGeo = new THREE.CylinderGeometry(1.15, 1.15, 3.8, 16, 1, false, -Math.PI/2, Math.PI);
    const glassMat = new THREE.MeshPhysicalMaterial({ 
        color: 0x00ffaa, 
        transparent: true, 
        opacity: 0.3,
        roughness: 0.1,
        metalness: 0.5,
        depthWrite: false // Evita sfarfallii del vetro
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = 2.1;
    tiltedGroup.add(glass);

    // Luce vitale interna
    const interiorLight = new THREE.PointLight(0x00ffaa, 1, 5);
    interiorLight.position.set(0, 2.1, 0.5);
    tiltedGroup.add(interiorLight);

    scene.add(podGroup);

    // 3. HITBOX INVISIBILE PER LE COLLISIONI
    // Creiamo un cubo "finto" che copre l'area del pod.
    const hitboxGeo = new THREE.BoxGeometry(3, 5, 3);
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false }); // Invisibile!
    const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
    
    // Posizioniamo l'hitbox esattamente dove si trova il pod
    hitbox.position.set(x, y + 2.5, z);
    scene.add(hitbox);
    
    // Aggiungiamo l'hitbox invisibile al sistema dei muri invece del pod!
    walls.push(hitbox);
}

function createEnergyPipe(x, z) {
    const pipeGroup = new THREE.Group();
    pipeGroup.position.set(x, 0, z);

    // Il tubo esterno (Griglia metallica o semitrasparente)
    const outerGeo = new THREE.CylinderGeometry(0.6, 0.6, 8, 16);
    const outerMat = new THREE.MeshStandardMaterial({ 
        color: 0x222222, 
        metalness: 0.9, 
        roughness: 0.2,
        transparent: true,
        opacity: 0.6
    });
    const outerPipe = new THREE.Mesh(outerGeo, outerMat);
    outerPipe.position.y = 4; // Centrato verticalmente rispetto all'altezza della stanza (h=8)
    pipeGroup.add(outerPipe);

    // Il nucleo di energia interno (Luminoso!)
    const innerGeo = new THREE.CylinderGeometry(0.2, 0.2, 8, 8);
    const innerMat = new THREE.MeshBasicMaterial({ 
        color: 0x0088ff, // Azzurro plasma (o rosso se vuoi un look di allarme)
    });
    const innerPipe = new THREE.Mesh(innerGeo, innerMat);
    innerPipe.position.y = 4;
    pipeGroup.add(innerPipe);

    scene.add(pipeGroup);
}

function createSciFiCeiling() {
    const ceilingGroup = new THREE.Group();
    
    // Supponendo che la tua stanza sia alta 8 e larga 40x40
    const roomHeight = 8; 
    ceilingGroup.position.y = roomHeight;

    // 1. IL PANNELLO BASE (Il vero e proprio soffitto scuro)
    const baseGeo = new THREE.BoxGeometry(40, 0.5, 40);
    const baseMat = new THREE.MeshStandardMaterial({ 
        color: 0x111111, 
        roughness: 0.9, // Molto ruvido, non deve riflettere troppo
        metalness: 0.3
    });
    const ceilingBase = new THREE.Mesh(baseGeo, baseMat);
    ceilingBase.position.y = 0.25; // Lo alziamo a filo con il bordo inferiore
    ceilingGroup.add(ceilingBase);

    // 2. LE TRAVI INDUSTRIALI CON NEON
    const beamGeo = new THREE.BoxGeometry(40, 0.6, 1);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8 });
    
    // Creiamo una trave ogni 4 metri usando un ciclo for
    for (let i = -18; i <= 18; i += 4) {
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(0, -0.1, i);
        ceilingGroup.add(beam);
        
        // Ogni due travi (quando 'i' è multiplo di 8), aggiungiamo una striscia LED
        if (i % 8 === 0) {
            // Il neon luminoso
            const ledGeo = new THREE.BoxGeometry(38, 0.05, 0.3);
            const ledMat = new THREE.MeshBasicMaterial({ color: 0x00aaff }); // Azzurro ciano
            const led = new THREE.Mesh(ledGeo, ledMat);
            led.position.set(0, -0.4, i); // Appena sotto la trave
            ceilingGroup.add(led);
            
            // La luce effettiva che illumina la stanza dall'alto
            const ceilLight = new THREE.PointLight(0x00aaff, 0.6, 20);
            ceilLight.position.set(0, -1, i);
            ceilingGroup.add(ceilLight);
        }
    }

    // 3. IL GENERATORE CENTRALE / BOCCHETTONE
    // Un dettaglio circolare al centro del soffitto per rompere tutte queste linee rette
    const coreGeo = new THREE.CylinderGeometry(3, 3, 0.8, 32);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x151515, metalness: 1 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = -0.2;
    ceilingGroup.add(core);

    const coreRingGeo = new THREE.CylinderGeometry(2, 2, 0.9, 32);
    const coreRingMat = new THREE.MeshBasicMaterial({ color: 0xff5500, wireframe: true });
    const coreRing = new THREE.Mesh(coreRingGeo, coreRingMat);
    coreRing.position.y = -0.25;
    ceilingGroup.add(coreRing);

    scene.add(ceilingGroup);

    ceilingGroup.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // 4. HITBOX PER LE COLLISIONI
    // Aggiungiamo il pannello base ai 'walls' così il giocatore non può 
    // uscire dalla mappa se salta troppo in alto (magari da sopra un server rack!)
    
    //walls.push(ceilingBase); 
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
    
    // --- IL TRUCCO CHE RISOLVE IL LAG ---
    // Creiamo un array contenente SOLO gli oggetti solidi (muri, pavimenti e il cristallo stesso)
    // Il raycaster ora controllerà 20 oggetti invece di 30.000!
    const ostacoliSolidi = [...walls, ...platforms, targetObj];
    
    // Usiamo il nuovo array "ostacoliSolidi" invece del vecchio "scene.children"
    const intersects = raycaster.intersectObjects(ostacoliSolidi, true);

    if (intersects.length > 0 && intersects[0].object !== targetObj && intersects[0].object.parent !== targetObj) {
        return 0; // La luce è bloccata da un muro o una piattaforma
    }

    return intensity; // La luce colpisce l'oggetto!
}

function openSciFiDoor() {
    if (isDoorOpen) return; // Se la porta è già aperta o si sta aprendo, non fare nulla
    isDoorOpen = true;

    // La prima volta che si apre, memorizziamo l'altezza iniziale della porta
    if (doorOriginalY === null) doorOriginalY = door.position.y;

    // 1. Animazione di Apertura (La porta sale di 8 unità)
    new TWEEN.Tween(door.position)
        .to({ y: doorOriginalY + 8 }, 1200)
        .easing(TWEEN.Easing.Cubic.Out)
        .start();

    // 2. Rimuoviamo temporaneamente la porta dalle collisioni per poter passare
    const doorIndex = walls.indexOf(door);
    if (doorIndex > -1) {
        walls.splice(doorIndex, 1);
    }

    // 3. IL TIMER: Aspetta 5 secondi (5000 millisecondi) e poi avvia la chiusura
    setTimeout(() => {
        closeSciFiDoor();
    }, 8000); 
}

function closeSciFiDoor() {
    // 1. Animazione di Chiusura (La porta torna alla sua Y originale)
    new TWEEN.Tween(door.position)
        .to({ y: doorOriginalY }, 1200)
        .easing(TWEEN.Easing.Cubic.In)
        .onComplete(() => {
            // Quando l'animazione è del tutto finita:
            isDoorOpen = false; // La porta può essere riaperta dai sensori
            
            // 2. Ripristiniamo la collisione della porta nel sistema dei muri
            if (!walls.includes(door)) {
                walls.push(door);
            }
        })
        .start();
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
    if (s1.userData.activated === true && s2.userData.activated === true && !isDoorOpen) {
        openSciFiDoor();
    }
}

function updateSpecialPlatforms() {
    platforms.forEach(plat => {
        if (plat.userData.type === 'normal') return;

        const i1 = isLampOn ? getIntensityOnObject(playerLamp, plat) : 0;
        const i2 = isLightOn ? getIntensityOnObject(interactLight, plat) : 0;
        const i3 = isLampOn ? getIntensityOnObject(playerGlow, plat) : 0;
        const isHitByLight = (i1 + i2 + i3) > 0.07;

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

function createSciFiCable(pointsArray) {
    // Controllo di sicurezza: servono almeno 2 punti per tracciare una curva!
    if (!pointsArray || pointsArray.length < 2) {
        console.warn("createSciFiCable: Servono almeno 2 punti (Vector3) per creare un cavo.");
        return null;
    }

    // Creiamo una curva morbida che unisce questi punti
    const cableCurve = new THREE.CatmullRomCurve3(pointsArray);

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
    const platformTex = textureLoader.load('./textures/debris.png');
    platformTex.wrapS = THREE.RepeatWrapping;
    platformTex.wrapT = THREE.RepeatWrapping;
    wallTex.wrapS = THREE.RepeatWrapping;
    wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(1, 1);
    doorTex.wrapS = THREE.RepeatWrapping;
    doorTex.wrapT = THREE.RepeatWrapping;
    doorTex.repeat.set(1, 1);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(4, 4);

    // --- STANZA PRINCIPALE (Allargata a 40x40) ---
    addPlatform(0, 0, 0, 40, 40, floorTex);

    // --- MURI (Ricalcolati per spazio 40x40) ---
    const h = 8; // Soffitto più alto per dare respiro (8 invece di 6)
    const t = 1;
    addWall(-20.5, h/2, 0, t, h, 40, 0xffffff, wallTex);      // Sinistra
    addWall(20.5, h/2, 0, t, h, 40, 0xffffff, wallTex);       // Destra
    
    // Frontale (Dove c'è la porta a Z = -20.5)
    // Essendo largo 40, dividiamo il muro in due pezzi larghi 17, lasciando 6 di buco per la porta
    addWall(-11.5, h/2, -20.5, 17, h, t, 0xffffff, wallTex);  // Davanti sx
    addWall(11.5, h/2, -20.5, 17, h, t, 0xffffff, wallTex);   // Davanti dx
    addWall(0, 6, -20.5, 6, 4, t, 0xffffff, wallTex);         // Trave alta sopra la porta

    // --- LA VETRATA PANORAMICA (Dietro) ---
    // Invece di un muro di pietra, creiamo un vetro oscurato e leggermente trasparente
    const glassGeo = new THREE.BoxGeometry(40, h, t);
    const glassMat = new THREE.MeshPhysicalMaterial({ 
        color: 0x112244, 
        transparent: true, 
        opacity: 0.3,     // Permette di vedere fuori!
        roughness: 0.1, 
        metalness: 0.5,
        fog: false,         // Ignora la nebbia: non diventerà mai opaca in lontananza!
        depthWrite: false   // Evita che il vetro "tagli" visivamente l'ologramma o la galassia dietro di esso
    });
    const giantWindow = new THREE.Mesh(glassGeo, glassMat);
    giantWindow.position.set(0, h/2, 20.5);
    scene.add(giantWindow);
    walls.push(giantWindow); // Se vogliamo che anche il vetro sia colpito dalle ombre dinamiche

    // --- PORTA ---
    door = addWall(0, h/3, -20.5, 6, h, 0.4, 0x442200, doorTex);

    // --- ARREDAMENTO DELLA STANZA ---
    // Inseriamo l'ologramma al centro della stanza
    createHologramTable(0, 0, 0);

    // Inseriamo due console/tablet ai lati della stanza
    createWallConsole(-18, 0, 5, Math.PI / 2); // Muro sinistro, ruotato di 90 gradi
    createWallConsole(18, 0, 5, -Math.PI / 2, true); // Muro destro, ruotato di -90 gradi

    // Esempio d'uso dentro createWorld():
    createEnergyPipe(-19, -19); // Angolo avanti-sinistra
    createEnergyPipe(19, -19);  // Angolo avanti-destra

    // Esempio d'uso vicino a un muro laterale:
    createCryoPod(-18, 0, -2, Math.PI / 2);
    createCryoPod(-18, 0, 1, Math.PI / 2);

    // Esempio d'uso:
    createMainframe(18, 0, -5, -Math.PI / 2);

    // Esempio d'uso (mettile dove il cammino è libero):
    createFloorVent(-10, 10);
    createFloorVent(10, 10);

    // Esempio d'uso (appeso sulla parete frontale, accanto alla porta):
    createWallRadar(8, 4, -19.4, 0);

    createSciFiCeiling();

    const mainCablePoints = [
        new THREE.Vector3(-19, 1, 14),     
        new THREE.Vector3(-19, 1, 12.5),     
        new THREE.Vector3(-19, 3, 10),    
        new THREE.Vector3(-19, 5, 9.0), 
        new THREE.Vector3(-19, 6, 3.0),    
        new THREE.Vector3(-19.5, 5.5, -10.0),     
    ];
    createSciFiCable(mainCablePoints);

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
        s1.position.set(18, 1, -10);
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
        s2.position.set(-18, 1, -10);
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

        buttonSwitch.rotation.y = Math.PI/2;
        buttonSwitch.position.set(-19, 0.25, 14);
        scene.add(buttonSwitch);
        console.log("Modello caricato correttamente");
    }, undefined, (error) => {
        console.error("Errore nel caricamento del modello:", error);
    });

    //luce interattiva
    interactLight = new THREE.PointLight(0xffaa00, 0, 15, 2);
    interactLight.position.set(-18, 5.5, -10);
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
        luce.position.set(-19, 5.5, -10);
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

    // --- PERCORSO ESTERNO (Distanze Scalate x2) ---
    // Inizio: Piattaforma di ingresso (Stabile)
    addPlatform(0, 0, -25, 5, 5, platformTex, false, 'normal', 'wreckage-A', true);

    // 1. Primo bivio: A sinistra (Light) o Centro (Normal)
    addPlatform(-6, 0.2, -35, 3, 3, platformTex, false, 'light-only', 'wreckage-B', true); 
    addPlatform(2, 0.3, -32, 4, 4, platformTex, false, 'normal', 'wreckage-C', true);

    // 2. Proseguimento centrale
    addPlatform(5, 0.5, -42, 3, 3, platformTex, true, 'normal', 'wreckage-A', true); // Moving
    platforms[platforms.length - 1].userData.moveAxis = 'x';

    // 3. Secondo bivio: A destra (Shadow - occhio!) o Sinistra (Normal)
    addPlatform(8, 0.7, -52, 3, 3, null, false, 'shadow', 'wreckage-C', true); 
    addPlatform(0, 0.8, -55, 4, 4, platformTex, false, 'normal', 'wreckage-B', true);

    // 4. Curva accentuata verso sinistra
    addPlatform(-5, 1.0, -65, 3, 3, platformTex, true, 'normal', 'wreckage-C', true); // Moving
    platforms[platforms.length - 1].userData.moveAxis = 'z';

    // 5. Piattaforma di "riposo" centrale
    addPlatform(-8, 1.2, -75, 5, 5, platformTex, false, 'normal', 'wreckage-A', true);

    // 6. Terzo bivio: Shadow (difficile) o Light (più facile ma devi trovarla)
    addPlatform(-12, 1.5, -85, 3, 3, null, false, 'shadow', 'wreckage-B', true);
    addPlatform(-4, 1.4, -88, 3, 3, platformTex, false, 'light-only', 'wreckage-C', true);

    // 7. Salto finale verso l'esterno sinistro
    addPlatform(-15, 1.8, -95, 4, 4, platformTex, false, 'normal', 'wreckage-A', true);
    addPlatform(-20, 2.0, -106, 6, 6, platformTex, false, 'normal', 'wreckage-C', true); // Piattaforma grande finale

    // --- IL SOLE ---

    // Posizioniamo il Sole più lontano nel cielo (Valori originali x2)
    const sunPosition = new THREE.Vector3(360, 160, -500); 

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
    sunPointLight = new THREE.PointLight(0xffaa00, 2.0, 1200); // Aumentato il raggio della luce a 1200 visto che è più lontano
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

    sunPivot5 = new THREE.Group();
    sunPivot5.position.copy(sunPosition);
    scene.add(sunPivot5);

    binaryPivot = new THREE.Group();
    binaryPivot.position.set(260, 70, -400);
    scene.add(binaryPivot);

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
        planet2.position.set(300, -20, -20);
    
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
        planet.position.set(-300, -40, 60);
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
        planet3.position.set(-300, 20, 100);
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
        planet4.scale.set(5, 5, 5); 
        // Posizioniamo il pianeta
        planet4.position.set(200, 0, 80);
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

    loader.load('./models/Planet5.glb', (gltf) => {
        // Assegniamo il modello caricato a planet5
        planet5 = gltf.scene;

        planet5.scale.set(4, 4, 4); 
        
        // Posizioniamo i pianeti speculari rispetto al centro del loro pivot (0,0,0 locale)
        // Invece di usare coordinate assolute mondiali, li spostiamo rispetto al binaryPivot
        planet5.position.set(-15, 0, 0); 
        
        // Rendiamo i modelli capaci di proiettare ombre
        planet5.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        

        // Aggiungiamo il baricentro al perno orbitale attorno al sole
        sunPivot5.add(binaryPivot);

        // Aggiungiamo i due pianeti al loro baricentro comune
        binaryPivot.add(planet5);

        console.log("Sistema binario caricato correttamente");
    }, undefined, (error) => {
        console.error("Errore nel caricamento del modello binario:", error);
    });

    loader.load('./models/Planet6.glb', (gltf) => {
        // Assegniamo il modello caricato a planet5
        planet6 = gltf.scene;
        
        planet6.scale.set(4, 4, 4);
        
        planet6.position.set(15, 0, 0); 
        
        planet6.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        binaryPivot.add(planet6);

        console.log("Sistema binario caricato correttamente");
    }, undefined, (error) => {
        console.error("Errore nel caricamento del modello binario:", error);
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

    // --- LA COMETA ---
    // 1. Gruppo principale posizionato esattamente sul Sole
    cometOrbitGroup = new THREE.Group();
    cometOrbitGroup.position.copy(sunPosition); 

    // INCLINAZIONE: Ruotiamo il piano dell'orbita per non renderlo parallelo agli altri pianeti
    cometOrbitGroup.rotation.x = 0.7; // Inclinazione trasversale
    cometOrbitGroup.rotation.z = 0.3; // Inclinazione longitudinale
    scene.add(cometOrbitGroup);

    // 2. Gruppo locale della cometa (conterrà nucleo + scia)
    cometGroup = new THREE.Group();
    cometGroup.userData = { theta: 0 }; // Angolo iniziale dell'orbita
    cometOrbitGroup.add(cometGroup);

    // 3. Il Nucleo della cometa (una sfera luminosa)
    const cometCoreGeo = new THREE.SphereGeometry(1.5, 16, 16);
    const cometCoreMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0x88ffff, // Bagliore azzurro glaciale
        emissiveIntensity: 3.0,
        fog: false
    });
    const cometCore = new THREE.Mesh(cometCoreGeo, cometCoreMat);
    cometGroup.add(cometCore);

    // 4. La Scia di Particelle (Sistema ottimizzato)
    const CometparticleCount = 1500; // Ottimo compromesso tra densità e prestazioni
    const tailLength = 45;      // Lunghezza della coda
    
    const tailGeo = new THREE.BufferGeometry();
    const tailPositions = new Float32Array(CometparticleCount * 3);
    const tailColors = new Float32Array(CometparticleCount * 3);

    // Colori della scia: da bianco/azzurro incandescente (vicino al nucleo) a blu scuro (alla fine)
    const colorHead = new THREE.Color(0xe6ffff); 
    const colorTail = new THREE.Color(0x0022cc);

    for (let i = 0; i < CometparticleCount; i++) {
        // La posizione Z va da 0 (vicino al nucleo) a tailLength (lontano)
        // NOTA: Usiamo valori positivi di Z. Poiché lookAt punta l'asse -Z verso il Sole,
        // posizionare le particelle su +Z le farà allungare perfettamente dalla parte opposta!
        const z = Math.random() * tailLength;

        // La scia si allarga man mano che ci si allontana dal nucleo
        const spread = (z / tailLength) * 5; 
        
        // Distribuzione circolare casuale (crea la forma del cono)
        const angle = Math.random() * Math.PI * 2;
        // Concentriamo più particelle al centro del cono e meno sui bordi esterni
        const radius = Math.pow(Math.random(), 2) * spread;

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        const i3 = i * 3;
        tailPositions[i3] = x;
        tailPositions[i3 + 1] = y;
        tailPositions[i3 + 2] = z;

        // Sfumiamo il colore in base alla distanza Z dal nucleo
        const mixedColor = colorHead.clone();
        mixedColor.lerp(colorTail, z / tailLength);
        
        tailColors[i3] = mixedColor.r;
        tailColors[i3 + 1] = mixedColor.g;
        tailColors[i3 + 2] = mixedColor.b;
    }

    tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPositions, 3));
    tailGeo.setAttribute('color', new THREE.BufferAttribute(tailColors, 3));
    tailGeo.rotateX(Math.PI );

    const tailMat = new THREE.PointsMaterial({
        size: 0.5,                  // Grandezza della singola particella
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending, // Somma i colori creando un bagliore intenso al centro
        depthWrite: false,          // Previene i fastidiosi "quadrati neri" di sovrapposizione
        fog: false
    });

    cometTail = new THREE.Points(tailGeo, tailMat);
    
    // IMPORTANTE: Spostiamo leggermente la coda all'indietro per non farla compenetrare col nucleo
    cometTail.position.z = 1.0; 
    
    cometGroup.add(cometTail);



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

    createGalaxy(-800, 400, -400);
    createGalaxy(200, 600, 1000, '#ffe6aa', '#15ff00');
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

// Funzione helper per aggiungere piattaforme/rottami

function addPlatform(x, y, z, w, d, texture, isMoving = false, type = 'normal', shape = 'square', wobble = false) {
    let geo;

    // --- 1. DISEGNO DEI FRAMMENTI DI NAVE IRREGOLARI ---
    if (shape === 'wreckage-A') {
        // Forma 1: Lamiera frastagliata a "L"
        const s = new THREE.Shape();
        s.moveTo(-w/2, -d/2);
        s.lineTo(w/2 * 0.8, -d/2 * 0.9); // Bordo storto
        s.lineTo(w/2, -d/2 * 0.2);       // Spacco profondo
        s.lineTo(w/2 * 0.7, 0);
        s.lineTo(w/2, d/2 * 0.8);
        s.lineTo(w/2 * 0.3, d/2);
        s.lineTo(-w/2 * 0.7, d/2 * 0.9);
        s.lineTo(-w/2 * 0.9, 0);
        s.lineTo(-w/2, -d/2);

        // Gonfiamo il disegno in 3D e smussiamo i bordi (bevel) per renderli metallici
        geo = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 });
        geo.rotateX(Math.PI / 2); // Lo sdraiamo a terra
        geo.translate(0, 0.25, 0); // Lo centriamo sull'asse Y per le collisioni

        // Applichiamo una proiezione cubica manuale alle UV
        const pos = geo.attributes.position;
        const uvs = [];

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const z = pos.getZ(i);

            // Proiezione basata sulla posizione: 
            // "avvolge" la texture attorno all'oggetto
            uvs.push(x / w, z / d); 
        }

        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

        // IL TRUCCO DELLE COLLISIONI: Falsifichiamo i parametri per ingannare animate()
        geo.parameters = { width: w, height: 0.5, depth: d };

    } else if (shape === 'wreckage-B') {
        // Forma 2: Ponte di volo spezzato a metà da un asteroide
        const s = new THREE.Shape();
        s.moveTo(-w/2, -d/2);
        s.lineTo(w/2, -d/2);
        s.lineTo(w/2, d/2);
        s.lineTo(-w/2 * 0.2, d/2); 
        s.lineTo(-w/2 * 0.5, d/2 * 0.5); // Area distrutta verso l'interno
        s.lineTo(-w/2 * 0.1, 0); 
        s.lineTo(-w/2, -d/2 * 0.5);
        s.lineTo(-w/2, -d/2);

        geo = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 });
        geo.rotateX(Math.PI / 2);
        geo.translate(0, 0.25, 0);

        // Applichiamo una proiezione cubica manuale alle UV
        const pos = geo.attributes.position;
        const uvs = [];


        //PER LE TEXTURE, MODIFICARE MAGARI USANDO MODELLI BLENDER
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const z = pos.getZ(i);

            // Proiezione basata sulla posizione: 
            // "avvolge" la texture attorno all'oggetto
            uvs.push(x / w, z / d); 
        }

        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        
        // TRUCCO COLLISIONI
        geo.parameters = { width: w, height: 0.5, depth: d };

    } else if (shape === 'wreckage-C') {
        // Forma 3: Frammento "a croce" o strutturale (tipico di una trave spezzata)
        const s = new THREE.Shape();
        s.moveTo(-w/2, -d/4);
        s.lineTo(-w/4, -d/4);
        s.lineTo(-w/5, -d/2);
        s.lineTo(w/4, -d/2);
        s.lineTo(w/3, -d/4);
        s.lineTo(w/2, -d/5);
        s.lineTo(w/2, d/4);
        s.lineTo(w/3, d/3);
        s.lineTo(w/3.5, d/3);
        s.lineTo(-w/4, d/2);
        s.lineTo(-w/5, d/4);
        s.lineTo(-w/2, d/4);

        geo = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1 });
        geo.rotateX(Math.PI / 2);
        geo.translate(0, 0.25, 0);

        // Applichiamo una proiezione cubica manuale alle UV
        const pos = geo.attributes.position;
        const uvs = [];

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);
            const z = pos.getZ(i);

            // Proiezione basata sulla posizione: 
            // "avvolge" la texture attorno all'oggetto
            uvs.push(x / w, z / d); 
        }

        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

        geo.parameters = { width: w, height: 0.5, depth: d };
    } else {
        // Quadrato classico di default
        geo = new THREE.BoxGeometry(w, 0.5, d);
    }

    // --- 2. MATERIALI ---
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
            opacity: 0 
        });
    } else {
        // Materiale più consono a rottami spaziali
        mat = new THREE.MeshStandardMaterial({ 
            map: texture,
            metalness: 0.6,
            roughness: 0.4 
        });
    }

    const plat = new THREE.Mesh(geo, mat);
    plat.position.set(x, y, z);
    plat.castShadow = true;
    plat.receiveShadow = true;

    // --- 3. CAVI ROTTI E MENO INGOMBRANTI ---
    if (type === 'normal' || type === 'shadow') {
        const brokenCablesCount = Math.floor(Math.random() * 3) + 1; // 1 o 3 cavi
        
        //MODIFICARE USANDO FUNZIONE APPOSTA
        for (let i = 0; i < brokenCablesCount; i++) {
            // Scegliamo un punto casuale LUNGO IL PERIMETRO (i bordi) usando un po' di trigonometria
            const randomAngle = Math.random() * Math.PI * 2;
            // Posizioniamo il cavo all'85% della distanza dal centro (quindi sui bordi)
            const localStartX = Math.cos(randomAngle) * (w / 2) * 0.85;
            const localStartZ = Math.sin(randomAngle) * (d / 2) * 0.85;

            // Cavi molto più corti e dinamici
            const cablePoints = [
                new THREE.Vector3(localStartX, -0.25, localStartZ), 
                new THREE.Vector3(localStartX + (Math.random() - 0.5) * 0.2, -0.6, localStartZ + (Math.random() - 0.5) * 0.2), 
                new THREE.Vector3(localStartX + (Math.random() - 0.5) * 0.5, -0.9, localStartZ + (Math.random() - 0.5) * 0.5)  
            ];

            const cableCurve = new THREE.CatmullRomCurve3(cablePoints);
            // Raggio del tubo dimezzato (0.015 invece di 0.03) -> Molto più snelli!
            const cableGeo = new THREE.TubeGeometry(cableCurve, 16, 0.015, 6, false);
            
            const brokenCableMat = new THREE.MeshStandardMaterial({
                color: 0x111111,
                metalness: 0.8,
                emissive: type === 'shadow' ? 0xc30010 : 0xc30010, 
                emissiveIntensity: 1.2
            });

            const cableMesh = new THREE.Mesh(cableGeo, brokenCableMat);
            plat.add(cableMesh);
        }
    }

    // --- 4. DATI DI STATO (Intatti per il tuo animate) ---
    plat.userData = {
        id: Math.random() * 100,
        isMoving: isMoving, 
        startZ: z, 
        startX: x,
        time: 0, 
        type: type, 
        active: (type === 'normal' || type === 'shadow'),
        wobble: wobble 
    };
    
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
    if (!isConsoleScreenOpen) {
        let currentSpeed = keys.shift ? 0.25 : 0.12;
        if (keys.w) player.translateZ(-currentSpeed);
        if (keys.s) player.translateZ(currentSpeed);
        if (keys.a) player.translateX(-currentSpeed);
        if (keys.d) player.translateX(currentSpeed);
    }

    if ((keys.w || keys.s || keys.a || keys.d) && !isConsoleScreenOpen) {
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
    if (player.position.y < -30) {
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

    //oscillazione piattaforme
    platforms.forEach(plat => {
        if (plat && plat.userData.wobble) {
            plat.position.y += Math.sin(currenttime + plat.userData.id) * 0.005; // Oscillazione verticale leggera
        }
    });

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
    if (sunPivot5) {
        sunPivot5.rotation.y += 0.0003; // Pianeta 5 più lento (orbita esterna)
    }
    //intergrazione seconda legge di Keplero per il sistema binario
    if (binaryPivot && planet5 && planet6) {
        // 1. Estraiamo il valore del seno per usarlo in due posti (oscilla sempre tra -1 e 1)
        const sineWave = Math.sin(1.5 * currenttime); 

        // 2. Rotazione variabile
        binaryPivot.rotation.y += Math.max(0.01, 0.05 * sineWave);

        // 3. Calcolo della distanza dinamica
        const baseDistance = 15; // La distanza media dal centro
        const variation = 6;     // Di quante unità si avvicineranno/allontaneranno al massimo
        
        // Sottraendo la variazione moltiplicata per il seno, otteniamo l'effetto elastico:
        // Quando sineWave è +1 (massima velocità) -> distanza = 15 - 6 = 9 (molto vicini)
        // Quando sineWave è -1 (minima velocità) -> distanza = 15 - (-6) = 21 (molto lontani)
        const currentDistance = baseDistance - (variation * sineWave);

        // 4. Aggiorniamo in tempo reale la posizione locale dei due pianeti
        planet5.position.x = -currentDistance;
        planet6.position.x = currentDistance;
    }

    if (holoSystem) {
        holoSystem.rotation.y += 0.01; // Fa ruotare il sistema olografico
    }

    // 3. I pianeti ruotano sul proprio asse
    if (planet) planet.rotation.y += 0.005;
    if (planet2) planet2.rotation.y += 0.003;
    if (planet3) planet3.rotation.y += 0.008;
    if (planet4) planet4.rotation.y += 0.003;
    if (planet5) planet5.rotation.y += 0.004;
    if (planet6) planet6.rotation.y += 0.004;

    // 4. La luna gira attorno al pianeta 2 
    if (moonPivot) {
        moonPivot.rotation.y += 0.015;
    }


    // --- FISICA E LOGICA DELLA COMETA ---
    if (cometGroup && sunMesh && cometTail) {
        // 1. Dimensioni dell'ellisse
        const a = 550; // Semi-asse maggiore (lunghezza)
        const b = 320; // Semi-asse minore (larghezza)

        // 2. Calcolo del Fuoco (Distanza dal centro)
        // Formula: c = radice quadrata di (a^2 - b^2)
        const c = Math.sqrt((a * a) - (b * b)); 

        // 3. Spostiamo l'ellisse! 
        // Sottraendo 'c' ad 'a * cos', mettiamo il Sole esattamente nel fuoco dell'ellisse.
        const xLoc = (a * Math.cos(cometGroup.userData.theta)) - c;
        const zLoc = b * Math.sin(cometGroup.userData.theta);
        cometGroup.position.set(xLoc, 0, zLoc);

        // 4. LA SCIA PERFETTA
        // Ora diciamo alla cometa di guardare la posizione GLOBALE del Sole.
        // Così facendo, il suo "muso" punta al sole e la scia si allunga perfettamente alle sue spalle.
        cometGroup.lookAt(sunMesh.position);

        // 5. SECONDA LEGGE DI KEPLERO (Velocità variabile)
        // distanceToSun ora è la distanza reale dal fuoco
        const distanceToSun = cometGroup.position.length();
    
        // La velocità è inversamente proporzionale alla distanza.
        // Quando passa vicinissima al sole (perielio) schizzerà a gran velocità, 
        // quando è lontana (afelio) sembrerà quasi ferma.
        const orbitSpeed = 20 / distanceToSun;
        
        //la lunghezza della coda si adatta alla distanza dal sole (più vicina = coda più lunga, più lontana = coda più corta)
        cometTail.scale.z = 0.4 + 200/distanceToSun; // La coda si allunga drasticamente quando è vicina al sole

        // Moltiplicatore 0.02 per bilanciare i frame e non farla andare a scatti
        cometGroup.userData.theta += orbitSpeed * 0.02; 
    }

    // --- ANIMAZIONE FLUIDA DELLA CODA (Zero impatto sulle prestazioni) ---
    if (cometTail) {
        const tail = cometTail;
        
        // Usiamo il tempo corrente per creare oscillazioni fluide
        const time = Date.now() * 0.004; 

        // 1. EFFETTO VORTICE
        // Facciamo ruotare la coda sul suo asse. Le particelle sembreranno 
        // turbinare come in un vero flusso di plasma energetico.
        tail.rotation.z += 0.1;

        // 2. EFFETTO FOLATA (Vento Solare instabile)
        // Usiamo Math.sin e Math.cos per far "sfarfallare" leggermente il diametro della coda.
        // Il moltiplicatore 0.04 significa un'oscillazione massima del 4%, molto naturale.
        tail.scale.x = 1.0 + Math.sin(time) * 0.1;
        tail.scale.y = 1.0 + Math.cos(time * 1.2) * 0.1;

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

    // --- FLUTTUAZIONE DEL PUNTO ESCLAMATIVO (!) ---
    if (consoleIndicator) {
        consoleIndicator.position.y = 3.5 + Math.sin(Date.now() * 0.004) * 0.15;
    }

    // --- SEZIONE UI (Controllo prossimità unificato) ---
    if (player && promptUI) {
        // Controlliamo se siamo vicini al bottone OPPURE alla console
        const isNearButton = buttonSwitch && player.position.distanceTo(buttonSwitch.position) < 3;
        const isNearConsole = scifiConsole && player.position.distanceTo(scifiConsole.position) < 4;
        
        if (isNearButton || isNearConsole) {
            promptUI.style.display = 'block'; // Mostra "Press [F] to interact"
        } else {
            promptUI.style.display = 'none';  // Nasconde il suggerimento
        }
    }

    // --- ANIMAZIONE DEL RADAR ---
    if (radarBlip) {
        blipTimer += 0.04; // Regola questo valore per cambiare la VELOCITÀ del lampeggio

        // Math.sin oscilla tra -1 e 1. Usiamo Math.max(0, ...) per fare in modo che 
        // resti invisibile per metà del tempo (quando il seno è negativo) simulando una pausa
        const opacityValue = Math.max(0, Math.sin(blipTimer));
        radarBlip.material.opacity = opacityValue;

        // Quando il timer compie un intero ciclo (2 * PI), il puntino è tornato invisibile.
        // Questo è il momento perfetto per spostarlo in un punto random senza che il giocatore lo veda saltare!
        if (blipTimer >= Math.PI * 2) {
            blipTimer = 0; // Resetta il ciclo del timer

            // Generiamo una posizione random dentro un cerchio usando la trigonometria.
            // Il radar ha un raggio di 1.9, quindi teniamo il puntino entro un raggio massimo di 1.6 per non farlo toccare i bordi.
            const randomAngle = Math.random() * Math.PI * 2;
            const randomRadius = Math.random() * 1.6; 

            // Calcoliamo le coordinate X e Y locali sulla faccia del radar
            radarBlip.position.x = Math.cos(randomAngle) * randomRadius;
            radarBlip.position.y = Math.sin(randomAngle) * randomRadius;
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
        if (e.key === ' ' && !isJumping && !isConsoleScreenOpen) {
            velocityY = jumpForce;
            isJumping = true;
        }

        //lampada
        if (e.key.toLowerCase() === 'e') {
            if (isConsoleScreenOpen) return; // Blocca l'interazione con la torcia se la console è aperta
            isLampOn = !isLampOn;
            playerLamp.intensity = isLampOn ? 9 : 0;
            playerGlow.intensity = isLampOn ? 5 : 0;
            console.log("Lampada: " + (isLampOn ? "Accesa" : "Spenta"));
        }

        //interazione con oggetti
        if (e.key.toLowerCase() === 'f') {

            // --- NUOVO: INTERAZIONE CON LA CONSOLE ---
            if (scifiConsole && player.position.distanceTo(scifiConsole.position) < 4) {
                const consoleUI = document.getElementById('console-ui');
                
                if (!isConsoleScreenOpen) {
                    consoleUI.style.display = 'block'; // Mostra la UI Sci-Fi
                    isConsoleScreenOpen = true;
                    
                    // Rimuove l'esclamativo se è la prima volta
                    if (!hasInteractedWithConsole) {
                        hasInteractedWithConsole = true;
                        if (consoleIndicator) {
                            scifiConsole.remove(consoleIndicator);
                            consoleIndicator.geometry.dispose();
                            consoleIndicator.material.dispose();
                            consoleIndicator = null;
                        }
                    }
                } else {
                    consoleUI.style.display = 'none'; // Chiude la UI
                    isConsoleScreenOpen = false;
                }
                return; // Esce dalla funzione così non attiva per sbaglio il bottone se fossero vicini
            }

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
            if (isConsoleScreenOpen) return; //to block mouse movement when console screen is open
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
