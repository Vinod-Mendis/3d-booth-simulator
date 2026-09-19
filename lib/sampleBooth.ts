import * as THREE from 'three';

/**
 * Creates an in-memory HTML5 Canvas texture with a gradient and text.
 */
function createScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 576; // 16:9
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Elegant dark gradient background
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e1b4b');
    grad.addColorStop(1, '#311042');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle tech grid lines
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < canvas.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Glowing border
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.8)';
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    // Corner accent brackets
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    const bracketSize = 30;
    // Top-left
    ctx.strokeRect(20, 20, bracketSize, bracketSize);
    // Top-right
    ctx.strokeRect(canvas.width - 20 - bracketSize, 20, bracketSize, bracketSize);
    // Bottom-left
    ctx.strokeRect(20, canvas.height - 20 - bracketSize, bracketSize, bracketSize);
    // Bottom-right
    ctx.strokeRect(canvas.width - 20 - bracketSize, canvas.height - 20 - bracketSize, bracketSize, bracketSize);

    // Badge
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.roundRect(canvas.width / 2 - 140, 140, 280, 36, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '600 16px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('STAGE DISPLAY • 16:9 • 5.6m × 3.15m', canvas.width / 2, 158);

    // Main text
    ctx.font = 'bold 56px sans-serif';
    const textGrad = ctx.createLinearGradient(0, 200, 0, 340);
    textGrad.addColorStop(0, '#ffffff');
    textGrad.addColorStop(1, '#93c5fd');
    ctx.fillStyle = textGrad;
    ctx.fillText('Your app goes here', canvas.width / 2, 270);

    // Subtitle
    ctx.font = '400 22px sans-serif';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.8)';
    ctx.fillText('Phase 2 interactive screen target (mesh: SCREEN_main)', canvas.width / 2, 350);

    // Bottom info indicator
    ctx.font = '500 15px monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.fillText('DoubleSide Material • Native Scale 1.0 • Unlit MeshBasicMaterial', canvas.width / 2, 490);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Builds the procedural sample booth:
 * - 14 x 10 m floor
 * - 6 m tall back wall and side walls
 * - Stage (8 x 3 m, 0.6 m high) with 3 steps (0.15 m each)
 * - 16:9 screen panel (5.6 x 3.15 m) named "SCREEN_main" with unlit material
 * - Truss structure
 * - Reception counter
 * - Two display plinths
 */
export function createSampleBooth(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'SampleBooth';

  // Shared materials with DoubleSide
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.75,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const wallAccentMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    roughness: 0.4,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });

  const stageMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.6,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });

  const stageEdgeMat = new THREE.MeshStandardMaterial({
    color: 0x6366f1,
    roughness: 0.3,
    metalness: 0.5,
    side: THREE.DoubleSide,
  });

  const trussMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.35,
    metalness: 0.85,
    side: THREE.DoubleSide,
  });

  const counterMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.5,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const counterTopMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.2,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });

  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.4,
    metalness: 0.2,
    side: THREE.DoubleSide,
  });

  // 1. FLOOR (14 x 10 m, thickness 0.04m, bottom at y=0, top at y=0.04)
  const floorGeom = new THREE.BoxGeometry(14, 0.04, 10);
  const floorMesh = new THREE.Mesh(floorGeom, floorMat);
  floorMesh.name = 'BoothFloor';
  floorMesh.position.set(0, 0.02, 0);
  root.add(floorMesh);

  // 2. BACK WALL (14 x 6 m, thickness 0.2m, bottom at y=0, top at y=6)
  const backWallGeom = new THREE.BoxGeometry(14, 6, 0.2);
  const backWallMesh = new THREE.Mesh(backWallGeom, wallMat);
  backWallMesh.name = 'BackWall';
  backWallMesh.position.set(0, 3, -4.9);
  root.add(backWallMesh);

  // Back wall top header banner trim
  const headerGeom = new THREE.BoxGeometry(14, 0.4, 0.25);
  const headerMesh = new THREE.Mesh(headerGeom, wallAccentMat);
  headerMesh.name = 'BackWallHeader';
  headerMesh.position.set(0, 5.8, -4.87);
  root.add(headerMesh);

  // 3. SIDE WALLS (6m tall, 10m deep, 0.2m thick)
  // Left wall
  const leftWallGeom = new THREE.BoxGeometry(0.2, 6, 10);
  const leftWallMesh = new THREE.Mesh(leftWallGeom, wallMat);
  leftWallMesh.name = 'LeftWall';
  leftWallMesh.position.set(-6.9, 3, 0);
  root.add(leftWallMesh);

  // Right wall
  const rightWallMesh = new THREE.Mesh(leftWallGeom, wallMat);
  rightWallMesh.name = 'RightWall';
  rightWallMesh.position.set(6.9, 3, 0);
  root.add(rightWallMesh);

  // Side accent vertical stripes
  const stripeGeom = new THREE.BoxGeometry(0.22, 5.2, 0.6);
  const leftStripe = new THREE.Mesh(stripeGeom, wallAccentMat);
  leftStripe.position.set(-6.89, 2.8, -1.8);
  root.add(leftStripe);

  const rightStripe = new THREE.Mesh(stripeGeom, wallAccentMat);
  rightStripe.position.set(6.89, 2.8, -1.8);
  root.add(rightStripe);

  // 4. STAGE (8 x 3 m, 0.6 m high)
  // Back edge at -4.8m, front edge at -1.8m (depth = 3m). Height = 0.6m, from y=0 to y=0.6m.
  const stageGeom = new THREE.BoxGeometry(8, 0.6, 3);
  const stageMesh = new THREE.Mesh(stageGeom, stageMat);
  stageMesh.name = 'Stage';
  stageMesh.position.set(0, 0.3, -3.3);
  root.add(stageMesh);

  // Stage front trim edge
  const stageFasciaGeom = new THREE.BoxGeometry(8, 0.08, 0.05);
  const stageFascia = new THREE.Mesh(stageFasciaGeom, stageEdgeMat);
  stageFascia.position.set(0, 0.56, -1.78);
  root.add(stageFascia);

  // 5. STAGE STEPS (3 steps of 0.15 m each)
  // Stage is 0.6m high.
  // Step 1: 0.15m high (y from 0 to 0.15m)
  // Step 2: 0.30m high (y from 0 to 0.30m)
  // Step 3: 0.45m high (y from 0 to 0.45m)
  // Width: 2.6m wide. Tread depth: 0.35m each.
  // Step 3 connects right to the stage front (-1.8m).
  const stepWidth = 2.6;
  const stepDepth = 0.35;

  // Step 3 (0.45m high, adjacent to stage at Z = -1.8)
  const step3Geom = new THREE.BoxGeometry(stepWidth, 0.45, stepDepth);
  const step3Mesh = new THREE.Mesh(step3Geom, stageMat);
  step3Mesh.name = 'StageStep_3';
  step3Mesh.position.set(0, 0.225, -1.8 + stepDepth / 2); // Z = -1.625
  root.add(step3Mesh);

  // Step 2 (0.30m high)
  const step2Geom = new THREE.BoxGeometry(stepWidth, 0.30, stepDepth);
  const step2Mesh = new THREE.Mesh(step2Geom, stageMat);
  step2Mesh.name = 'StageStep_2';
  step2Mesh.position.set(0, 0.15, -1.8 + stepDepth * 1.5); // Z = -1.275
  root.add(step2Mesh);

  // Step 1 (0.15m high)
  const step1Geom = new THREE.BoxGeometry(stepWidth, 0.15, stepDepth);
  const step1Mesh = new THREE.Mesh(step1Geom, stageMat);
  step1Mesh.name = 'StageStep_1';
  step1Mesh.position.set(0, 0.075, -1.8 + stepDepth * 2.5); // Z = -0.925
  root.add(step1Mesh);

  // Step edge highlights for clean visibility
  for (let i = 1; i <= 3; i++) {
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(stepWidth, 0.02, 0.04),
      stageEdgeMat
    );
    const yPos = i * 0.15;
    const zPos = -1.8 + (3.5 - i) * stepDepth - 0.02;
    edge.position.set(0, yPos - 0.01, zPos);
    root.add(edge);
  }

  // 6. SCREEN PANEL (16:9, 5.6 x 3.15 m)
  // Must be named "SCREEN_main" and have unlit MeshBasicMaterial
  const screenGeom = new THREE.BoxGeometry(5.6, 3.15, 0.06);
  const screenTexture = createScreenTexture();
  const screenMat = new THREE.MeshBasicMaterial({
    map: screenTexture,
    side: THREE.DoubleSide,
  });
  const screenMesh = new THREE.Mesh(screenGeom, screenMat);
  screenMesh.name = 'SCREEN_main';
  screenMesh.position.set(0, 3.3, -4.77);
  root.add(screenMesh);

  // Screen bezel frame
  const bezelMat = new THREE.MeshStandardMaterial({
    color: 0x090d16,
    roughness: 0.2,
    metalness: 0.8,
    side: THREE.DoubleSide,
  });
  const frameGeom = new THREE.BoxGeometry(5.72, 3.27, 0.04);
  const frameMesh = new THREE.Mesh(frameGeom, bezelMat);
  frameMesh.name = 'ScreenFrame';
  frameMesh.position.set(0, 3.3, -4.8);
  root.add(frameMesh);

  // 7. TRUSS STRUCTURE
  // Aluminum truss spanning across stage front (Y = 5.2m, Z = -1.8m)
  const trussGroup = new THREE.Group();
  trussGroup.name = 'TrussRig';

  // Horizontal top & bottom chord pipes
  const trussWidth = 10;
  const chordGeom = new THREE.CylinderGeometry(0.04, 0.04, trussWidth, 12);
  chordGeom.rotateZ(Math.PI / 2);

  const pipe1 = new THREE.Mesh(chordGeom, trussMat);
  pipe1.position.set(0, 5.4, -1.8 + 0.15);
  trussGroup.add(pipe1);

  const pipe2 = new THREE.Mesh(chordGeom, trussMat);
  pipe2.position.set(0, 5.4, -1.8 - 0.15);
  trussGroup.add(pipe2);

  const pipe3 = new THREE.Mesh(chordGeom, trussMat);
  pipe3.position.set(0, 5.0, -1.8 + 0.15);
  trussGroup.add(pipe3);

  const pipe4 = new THREE.Mesh(chordGeom, trussMat);
  pipe4.position.set(0, 5.0, -1.8 - 0.15);
  trussGroup.add(pipe4);

  // Vertical support columns at left and right
  const colGeom = new THREE.CylinderGeometry(0.05, 0.05, 5.4, 12);
  const leftCol = new THREE.Mesh(colGeom, trussMat);
  leftCol.position.set(-4.8, 2.7, -1.8);
  trussGroup.add(leftCol);

  const rightCol = new THREE.Mesh(colGeom, trussMat);
  rightCol.position.set(4.8, 2.7, -1.8);
  trussGroup.add(rightCol);

  // Truss diagonal struts
  const strutGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8);
  for (let x = -4.5; x <= 4.5; x += 0.9) {
    const strutA = new THREE.Mesh(strutGeom, trussMat);
    strutA.position.set(x, 5.2, -1.8);
    strutA.rotation.z = Math.PI / 4;
    trussGroup.add(strutA);

    const strutB = new THREE.Mesh(strutGeom, trussMat);
    strutB.position.set(x, 5.2, -1.8);
    strutB.rotation.z = -Math.PI / 4;
    trussGroup.add(strutB);
  }

  // Spotlights attached to truss
  const spotFixtGeom = new THREE.CylinderGeometry(0.08, 0.14, 0.25, 16);
  const spotMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.3,
    metalness: 0.7,
    side: THREE.DoubleSide,
  });
  const spotPositions = [-3.2, -1.2, 1.2, 3.2];
  spotPositions.forEach((xPos) => {
    const fixture = new THREE.Mesh(spotFixtGeom, spotMat);
    fixture.position.set(xPos, 4.88, -1.8);
    fixture.rotation.x = Math.PI / 6;
    trussGroup.add(fixture);
  });

  root.add(trussGroup);

  // 8. RECEPTION COUNTER
  // Placed near entrance at X = -2.5m, Z = 2.5m
  // Dimensions: 2.4m wide, 0.8m deep, 1.05m high
  const counterGroup = new THREE.Group();
  counterGroup.name = 'ReceptionCounter';
  counterGroup.position.set(-2.5, 0, 2.5);

  // Counter main body
  const counterBodyGeom = new THREE.BoxGeometry(2.4, 1.0, 0.8);
  const counterBody = new THREE.Mesh(counterBodyGeom, counterMat);
  counterBody.position.set(0, 0.5, 0);
  counterGroup.add(counterBody);

  // Counter top
  const counterTopGeom = new THREE.BoxGeometry(2.5, 0.06, 0.9);
  const counterTop = new THREE.Mesh(counterTopGeom, counterTopMat);
  counterTop.position.set(0, 1.03, 0);
  counterGroup.add(counterTop);

  // Counter front accent panel with glow
  const counterFrontGeom = new THREE.BoxGeometry(2.2, 0.8, 0.04);
  const counterFront = new THREE.Mesh(counterFrontGeom, wallAccentMat);
  counterFront.position.set(0, 0.5, 0.42);
  counterGroup.add(counterFront);

  root.add(counterGroup);

  // 9. TWO DISPLAY PLINTHS
  // Plinth A (X = 3.0m, Z = 1.5m, 0.8 x 0.8 x 0.9m)
  const plinthAGroup = new THREE.Group();
  plinthAGroup.name = 'DisplayPlinth_A';
  plinthAGroup.position.set(3.0, 0, 1.5);

  const plinthABody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.8), plinthMat);
  plinthABody.position.set(0, 0.45, 0);
  plinthAGroup.add(plinthABody);

  const plinthATop = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.04, 0.84), counterTopMat);
  plinthATop.position.set(0, 0.92, 0);
  plinthAGroup.add(plinthATop);

  // Decorative display sample gem on plinth A
  const gemGeom = new THREE.OctahedronGeometry(0.18, 0);
  const gemMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.1,
    metalness: 0.9,
    side: THREE.DoubleSide,
  });
  const gemA = new THREE.Mesh(gemGeom, gemMat);
  gemA.position.set(0, 1.15, 0);
  plinthAGroup.add(gemA);

  root.add(plinthAGroup);

  // Plinth B (X = 3.0m, Z = -0.5m, 0.8 x 0.8 x 0.9m)
  const plinthBGroup = new THREE.Group();
  plinthBGroup.name = 'DisplayPlinth_B';
  plinthBGroup.position.set(3.0, 0, -0.5);

  const plinthBBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.8), plinthMat);
  plinthBBody.position.set(0, 0.45, 0);
  plinthBGroup.add(plinthBBody);

  const plinthBTop = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.04, 0.84), counterTopMat);
  plinthBTop.position.set(0, 0.92, 0);
  plinthBGroup.add(plinthBTop);

  const torusGeom = new THREE.TorusGeometry(0.15, 0.05, 16, 32);
  const torusMat = new THREE.MeshStandardMaterial({
    color: 0xa855f7,
    roughness: 0.15,
    metalness: 0.85,
    side: THREE.DoubleSide,
  });
  const gemB = new THREE.Mesh(torusGeom, torusMat);
  gemB.position.set(0, 1.15, 0);
  gemB.rotation.x = Math.PI / 4;
  plinthBGroup.add(gemB);

  root.add(plinthBGroup);

  // Apply DoubleSide and shadows to all meshes
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            mat.side = THREE.DoubleSide;
          });
        } else {
          mesh.material.side = THREE.DoubleSide;
        }
      }
    }
  });

  return root;
}
