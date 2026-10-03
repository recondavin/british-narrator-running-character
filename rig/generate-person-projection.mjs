import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(here, 'person-rig-candidate.svg');
const outputPath = path.join(here, 'person-rig-projected.svg');

const source = fs.readFileSync(sourcePath, 'utf8');

const projectionRuntime = String.raw`
  <script><![CDATA[
    (() => {
      const angle = Number(new URLSearchParams(location.search).get('t') || 0);
      if (!Number.isFinite(angle) || Math.abs(angle) < 1e-9) return;

      const radians = angle * Math.PI / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      const torsoWidth = 216;
      const torsoDepth = torsoWidth * 0.4;
      const torsoCenterX = 360;
      const chestZ = torsoWidth * 0.2;
      const spineZ = -torsoWidth * 0.2;

      const anchors = {
        'hand-left':       { id: 'rig-hand-left',        x: -112, y: 586, z: -30,    baseX:  0, baseY: 8 },
        'forearm-left':    { id: 'rig-arm-left-forearm', x: -116, y: 423, z: -35,    baseX:  0, baseY: 8 },
        'upper-arm-left':  { id: 'rig-arm-left-upper',   x: -108, y: 301, z: spineZ, baseX:  0, baseY: 8 },
        'hand-right':      { id: 'rig-hand-right',       x:  112, y: 586, z: -30,    baseX:  0, baseY: 8 },
        'forearm-right':   { id: 'rig-arm-right-forearm',x:  116, y: 423, z: -35,    baseX:  0, baseY: 8 },
        'upper-arm-right': { id: 'rig-arm-right-upper',  x:  108, y: 301, z: spineZ, baseX:  0, baseY: 8 },
        'foot-left':       { id: 'rig-foot-left',        x:  -55, y: 1005,z: -40,    baseX: -8, baseY: 75 },
        'lower-leg-left':  { id: 'rig-leg-left-lower',   x:  -49.7780678851175, y: 805, z: -40, baseX: -8, baseY: 75 },
        'upper-leg-left':  { id: 'rig-leg-left-upper',   x:  -45, y: 622, z: spineZ, baseX: -14, baseY: 75 },
        'foot-right':      { id: 'rig-foot-right',       x:   55, y: 1005,z: -40,    baseX:  8, baseY: 75 },
        'lower-leg-right': { id: 'rig-leg-right-lower',  x:   49.7780678851175, y: 805, z: -40, baseX: 8, baseY: 75 },
        'upper-leg-right': { id: 'rig-leg-right-upper',  x:   45, y: 622, z: spineZ, baseX: 14, baseY: 75 },
        torso:       { id: 'layer-torso',         x:   0, y: 421, z: chestZ, baseX: 0, baseY: 0 },
        emblem:      { id: 'shirt-emblem',        x:   0, y: 381, z: chestZ, visualX: 11, baseX: 0, baseY: 0 }
      };
      window.PERSON_PROJECTION_ANCHORS = anchors;

      const project = ({ x, y, z }) => ({
        screenX: x * cos + z * sin,
        screenY: y,
        depth: z * cos - x * sin
      });
      const forwardScreenX = sin;
      const backSide = forwardScreenX >= 0 ? 'right' : 'left';
      const frontSide = backSide === 'right' ? 'left' : 'right';

      const darkMap = new Map([
        ['#5638b7', '#472e9c'],
        ['#7652d9', '#5a3eb5'],
        ['#ffad79', '#f19a69'],
        ['#11c5c1', '#0da9b3'],
        ['#8ff4eb', '#65ddd8'],
        ['#3f2793', '#36217e']
      ]);

      function applyTone(root, dark) {
        if (!dark) return;
        [root, ...root.querySelectorAll('*')].forEach(element => {
          for (const attribute of ['fill', 'stroke']) {
            const value = element.getAttribute(attribute)?.toLowerCase();
            if (darkMap.has(value)) element.setAttribute(attribute, darkMap.get(value));
          }
        });
      }

      const rigPerson = document.getElementById('rig-person');
      rigPerson.dataset.headingDegrees = angle.toFixed(1);
      rigPerson.dataset.forwardScreenX = forwardScreenX.toFixed(4);
      rigPerson.dataset.walkDirection = forwardScreenX >= 0 ? 'screen-right' : 'screen-left';
      const lowerLegClip = document.querySelector('#clip-leg-bottom rect');
      lowerLegClip.setAttribute('height', '935');
      lowerLegClip.dataset.projectedBottom = 'original-width-shoe-locked-to-leg';
      const stage = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      stage.id = 'projection-stage';
      stage.dataset.angle = String(angle);
      rigPerson.append(stage);

      const parts = [];
      const articulatedPartNames = [
        'hand-left', 'forearm-left', 'upper-arm-left',
        'hand-right', 'forearm-right', 'upper-arm-right',
        'foot-left', 'lower-leg-left', 'upper-leg-left',
        'foot-right', 'lower-leg-right', 'upper-leg-right'
      ];
      for (const name of articulatedPartNames) {
        const anchor = anchors[name];
        const node = document.getElementById(anchor.id);
        const projected = project(anchor);
        const atZero = anchor.x;
        const isLegPart = name.includes('leg') || name.startsWith('foot-');
        const legTorsoInsetX = isLegPart ? 34 * sin : 0;
        const deltaX = projected.screenX - atZero + legTorsoInsetX;
        const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        wrapper.id = 'projection-' + name;
        wrapper.dataset.depth = projected.depth.toFixed(4);
        const baseTransform = 'translate(' + (anchor.baseX + deltaX) + ' ' + anchor.baseY + ')';
        wrapper.dataset.baseTransform = baseTransform;
        wrapper.setAttribute('transform', baseTransform);
        wrapper.append(node);
        applyTone(wrapper, projected.depth < 0);
        stage.append(wrapper);
        parts.push({ name, node: wrapper, depth: projected.depth });
      }

      const torso = document.getElementById('layer-torso');
      const emblem = document.getElementById('shirt-emblem');
      emblem.remove();

      const torsoProjectedWidth = torsoWidth * cos + torsoDepth * sin;
      const torsoScaleX = torsoProjectedWidth / torsoWidth;
      const torsoWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      torsoWrapper.id = 'projection-torso';
      const torsoProjected = project(anchors.torso);
      torsoWrapper.dataset.depth = torsoProjected.depth.toFixed(4);
      torsoWrapper.dataset.apparentWidth = torsoProjectedWidth.toFixed(4);
      const torsoBaseTransform = 'translate(' + torsoCenterX + ' 0) scale(' + torsoScaleX + ' 1) translate(' + (-torsoCenterX) + ' 0)';
      torsoWrapper.dataset.baseTransform = torsoBaseTransform;
      torsoWrapper.setAttribute('transform', torsoBaseTransform);
      torsoWrapper.append(torso);
      stage.append(torsoWrapper);
      parts.push({ name: 'torso', node: torsoWrapper, depth: torsoProjected.depth });

      const emblemProjected = project(anchors.emblem);
      const emblemWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      emblemWrapper.id = 'projection-emblem';
      emblemWrapper.dataset.depth = emblemProjected.depth.toFixed(4);
      const emblemScreenOffset = anchors.emblem.visualX * cos + emblemProjected.screenX;
      const emblemBaseTransform = 'translate(' + (torsoCenterX + emblemScreenOffset) + ' 0) scale(' + cos + ' 1) translate(-371 0)';
      emblemWrapper.dataset.baseTransform = emblemBaseTransform;
      emblemWrapper.setAttribute('transform', emblemBaseTransform);
      emblemWrapper.append(emblem);
      stage.append(emblemWrapper);
      parts.push({ name: 'emblem', node: emblemWrapper, depth: emblemProjected.depth });

      function replaceCuff(lineId, forearmId, cx, cy, radius, dark) {
        document.getElementById(lineId).setAttribute('visibility', 'hidden');
        const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        ellipse.id = 'projection-' + lineId;
        ellipse.setAttribute('cx', cx);
        ellipse.setAttribute('cy', cy);
        ellipse.setAttribute('rx', radius * cos);
        ellipse.setAttribute('ry', 5.5);
        ellipse.setAttribute('fill', 'none');
        ellipse.setAttribute('stroke', dark);
        ellipse.setAttribute('stroke-width', 6);
        document.getElementById(forearmId).append(ellipse);
      }
      replaceCuff('sleeve-left-wrist-edge', 'rig-arm-left-forearm', 204, 578, 28, '#3f2793');
      replaceCuff('sleeve-right-wrist-edge', 'rig-arm-right-forearm', 516, 578, 28, '#36217e');

      function yawShoe(side, pivotX, depth) {
        const art = document.getElementById('art-foot-' + side);
        const foot = document.getElementById('rig-foot-' + side);
        const shoeBase = document.getElementById('foot-' + side + '-shoe');
        const collar = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        collar.id = 'projection-shoe-collar-' + side;
        collar.setAttribute('cx', pivotX);
        collar.setAttribute('cy', 900);
        collar.setAttribute('rx', 31);
        collar.setAttribute('ry', 25);
        collar.setAttribute('fill', shoeBase.getAttribute('fill'));
        foot.insertBefore(collar, art);
        const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        wrapper.id = 'projection-shoe-' + side;
        const depthScale = 1 + (depth / torsoWidth) * 0.5;
        const yawScale = cos + 0.55 * sin;
        const rearAttachmentWidth = depth < 0 ? 1.15 : 1;
        const scaleX = yawScale * depthScale * rearAttachmentWidth;
        const attachmentLift = 22 * Math.abs(sin);
        const groundCorrection = depth < 0 ? 1.86 : 0;
        const peakArtX = side === 'left' ? 302.4963486116023 : 417.5036513883977;
        const peakArtY = 903.1387929553291;
        const yawRadians = 20 * sin * Math.PI / 180;
        const projectedPeakX = pivotX
          + (peakArtX - pivotX) * scaleX
          + Math.tan(yawRadians) * (peakArtY - 930);
        const peakCorrection = pivotX - projectedPeakX;
        wrapper.dataset.attachmentLift = attachmentLift.toFixed(3);
        wrapper.dataset.groundCorrection = groundCorrection.toFixed(3);
        wrapper.dataset.peakCorrection = peakCorrection.toFixed(3);
        wrapper.setAttribute('transform', 'translate(' + peakCorrection + ' ' + (-attachmentLift + groundCorrection) + ') translate(' + pivotX + ' 930) skewX(' + (20 * sin) + ') scale(' + scaleX + ' 1) translate(' + (-pivotX) + ' -930)');
        art.replaceWith(wrapper);
        wrapper.append(art);
        foot.append(wrapper);
      }
      yawShoe('left', 313, project(anchors['foot-left']).depth);
      yawShoe('right', 407, project(anchors['foot-right']).depth);

      const tieOrder = {
        'lower-leg-left': 0,
        'foot-left': 1,
        'lower-leg-right': 0,
        'foot-right': 1,
        torso: 0,
        emblem: 1
      };
      const rearLowerLegPart = parts.find(part => part.name === 'lower-leg-' + backSide);
      const rearFootPart = parts.find(part => part.name === 'foot-' + backSide);
      rearFootPart.depth = rearLowerLegPart.depth;
      rearFootPart.node.dataset.depth = rearLowerLegPart.depth.toFixed(4);
      // Upper limbs start inside the torso. Their attachment sections must
      // remain behind the shirt even when the forearm and hand are on the near
      // side; otherwise the shoulder capsule visibly lies across the chest.
      for (const part of parts) {
        part.sortDepth = part.name.startsWith('upper-leg-')
          ? Math.min(part.depth, torsoProjected.depth - 0.001)
          : part.depth;
      }
      parts.sort((a, b) => a.sortDepth - b.sortDepth || (tieOrder[a.name] ?? 0) - (tieOrder[b.name] ?? 0) || a.name.localeCompare(b.name));
      for (const part of parts) stage.append(part.node);
      rigPerson.dataset.projectionOrder = parts.map(part => part.name).join(',');
      rigPerson.dataset.hipOcclusion = 'torso-over-upper-legs';
      rigPerson.dataset.torsoWidth = torsoProjectedWidth.toFixed(4);
      rigPerson.dataset.emblemOffset = emblemScreenOffset.toFixed(4);

      const workHead = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      workHead.id = 'projection-work-head';
      workHead.dataset.baseTransform = 'translate(360 0) scale(.9 1) translate(-360 0)';
      workHead.setAttribute('visibility', 'hidden');
      stage.append(workHead);

      // The work area is fixed to the ground, never to the character root.
      const workObject = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      workObject.id = 'work-object';
      workObject.dataset.role = 'ground-work-area';
      workObject.setAttribute('visibility', 'hidden');
      workObject.innerHTML = [
        '<rect id="work-ground" x="0" y="872" width="720" height="168" fill="#32196f"/>',
        '<path d="M0 876H720" fill="none" stroke="#7652d9" stroke-width="8"/>',
        '<path d="M430 840L470 910" fill="none" stroke="#11c5c1" stroke-width="12" stroke-linecap="round"/>'
      ].join('');
      document.documentElement.insertBefore(workObject, rigPerson);
      const workGroundForeground = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      workGroundForeground.id = 'work-ground-foreground';
      workGroundForeground.setAttribute('visibility', 'hidden');
      workGroundForeground.innerHTML = '<rect x="0" y="882" width="720" height="158" fill="#32196f"/>';
      document.documentElement.append(workGroundForeground);

      // Keep both arms as connected hinge chains. Each forearm and hand uses
      // its upper arm's projected offset, then inherits the upper-arm and
      // elbow rotations around the original SVG pivots.
      const backUpperWrapper = document.getElementById('projection-upper-arm-' + backSide);
      const rearShoulderForwardX = 18 * (Math.sign(forwardScreenX) || 1);
      const backUpperBaseTransform = 'translate(' + rearShoulderForwardX + ' 0) ' + backUpperWrapper.dataset.baseTransform;
      backUpperWrapper.dataset.baseTransform = backUpperBaseTransform;
      backUpperWrapper.setAttribute('transform', backUpperBaseTransform);
      for (const side of ['left', 'right']) {
        const upperBaseTransform = document.getElementById('projection-upper-arm-' + side).dataset.baseTransform;
        for (const id of ['projection-forearm-' + side, 'projection-hand-' + side]) {
          document.getElementById(id).dataset.baseTransform = upperBaseTransform;
        }
        const upperLegBaseTransform = document.getElementById('projection-upper-leg-' + side).dataset.baseTransform;
        for (const id of ['projection-lower-leg-' + side, 'projection-foot-' + side]) {
          document.getElementById(id).dataset.baseTransform = upperLegBaseTransform;
        }
      }

      const inheritedRigTransforms = {
        'projection-upper-arm-left':  { outer: ['rig-upper-body'], joints: [] },
        'projection-forearm-left':    { outer: ['rig-upper-body'], joints: ['rig-arm-left-upper'] },
        'projection-hand-left':       { outer: ['rig-upper-body'], joints: ['rig-arm-left-upper', 'rig-arm-left-forearm'] },
        'projection-upper-arm-right': { outer: ['rig-upper-body'], joints: [] },
        'projection-forearm-right':   { outer: ['rig-upper-body'], joints: ['rig-arm-right-upper'] },
        'projection-hand-right':      { outer: ['rig-upper-body'], joints: ['rig-arm-right-upper', 'rig-arm-right-forearm'] },
        'projection-lower-leg-left':  { outer: [], joints: ['rig-leg-left-upper'] },
        'projection-foot-left':       { outer: [], joints: ['rig-leg-left-upper', 'rig-leg-left-lower'] },
        'projection-lower-leg-right': { outer: [], joints: ['rig-leg-right-upper'] },
        'projection-foot-right':      { outer: [], joints: ['rig-leg-right-upper', 'rig-leg-right-lower'] },
        'projection-torso':           { outer: ['rig-upper-body'], joints: [] },
        'projection-emblem':          { outer: ['rig-upper-body'], joints: [] },
        'projection-work-head':       { outer: ['rig-upper-body'], joints: [] }
      };

      let projectedWalkStartedAt = null;
      const qaTimeParam = new URLSearchParams(location.search).get('qaTime');
      const fixedQaSeconds = qaTimeParam === null ? null : Number(qaTimeParam);
      function rotationOf(id) {
        const transform = document.getElementById(id)?.getAttribute('transform') || '';
        return Number(transform.match(/rotate\(([-+0-9.eE]+)/)?.[1] || 0);
      }

      function setRotation(id, angle) {
        const element = document.getElementById(id);
        if (!element) return;
        element.setAttribute(
          'transform',
          'rotate(' + angle + ' ' + element.dataset.pivotX + ' ' + element.dataset.pivotY + ')'
        );
      }

      function setUpperBodyPose(angle, forwardX = 0, forwardY = 0) {
        const element = document.getElementById('rig-upper-body');
        element.setAttribute(
          'transform',
          'translate(' + forwardX + ' ' + forwardY + ') rotate(' + angle + ' '
            + element.dataset.pivotX + ' ' + element.dataset.pivotY + ')'
        );
      }

      function baseTranslation(wrapperId) {
        const base = document.getElementById(wrapperId)?.dataset.baseTransform || '';
        const match = base.match(/^translate\(([-+0-9.eE]+) ([-+0-9.eE]+)\)/);
        return match ? { x: Number(match[1]), y: Number(match[2]) } : { x: 0, y: 0 };
      }

      function projectedLegSpec(side) {
        const upper = document.getElementById('rig-leg-' + side + '-upper');
        const lower = document.getElementById('rig-leg-' + side + '-lower');
        const foot = document.getElementById('rig-foot-' + side);
        const base = baseTranslation('projection-upper-leg-' + side);
        const hip = {
          x: Number(upper.dataset.pivotX) + base.x,
          y: Number(upper.dataset.pivotY) + base.y
        };
        const knee = {
          x: Number(lower.dataset.pivotX) + base.x,
          y: Number(lower.dataset.pivotY) + base.y
        };
        const ankle = {
          x: Number(foot.dataset.pivotX) + base.x,
          y: Number(foot.dataset.pivotY) + base.y
        };
        const upperVector = { x: knee.x - hip.x, y: knee.y - hip.y };
        const lowerVector = { x: ankle.x - knee.x, y: ankle.y - knee.y };
        return {
          hip,
          upperVector,
          lowerVector,
          upperLength: Math.hypot(upperVector.x, upperVector.y),
          lowerLength: Math.hypot(lowerVector.x, lowerVector.y),
          upperBase: Math.atan2(upperVector.y, upperVector.x),
          lowerBase: Math.atan2(lowerVector.y, lowerVector.x)
        };
      }

      const projectedLegSpecs = {
        left: projectedLegSpec('left'),
        right: projectedLegSpec('right')
      };

      function projectedAnkleForHeel(baseAnkleX, baseAnkleY, heelAngle) {
        const facing = Math.sign(forwardScreenX) || 1;
        const isToeOff = heelAngle * facing >= 0;
        const pivotOffsetX = (isToeOff ? 70 : -45) * facing;
        const pivotOffsetY = 15.5;
        const radians = heelAngle * Math.PI / 180;
        const rotatedPivotX = pivotOffsetX * Math.cos(radians) - pivotOffsetY * Math.sin(radians);
        const rotatedPivotY = pivotOffsetX * Math.sin(radians) + pivotOffsetY * Math.cos(radians);
        return {
          x: baseAnkleX + pivotOffsetX - rotatedPivotX,
          y: baseAnkleY + pivotOffsetY - rotatedPivotY
        };
      }

      function solveProjectedLeg(side, ankleX, ankleY, rootX, rootY, footWorldAngle = 0) {
        const spec = projectedLegSpecs[side];
        const dx = ankleX - rootX - spec.hip.x;
        const dy = ankleY - rootY - spec.hip.y;
        const distanceSquared = dx * dx + dy * dy;
        const cosine = Math.max(-1, Math.min(1,
          (distanceSquared - spec.upperLength * spec.upperLength - spec.lowerLength * spec.lowerLength)
          / (2 * spec.upperLength * spec.lowerLength)
        ));
        const bend = Math.acos(cosine);
        const upperWorld = Math.atan2(dy, dx) - Math.atan2(
          spec.lowerLength * Math.sin(bend),
          spec.upperLength + spec.lowerLength * Math.cos(bend)
        );
        const toDegrees = 180 / Math.PI;
        const upper = (upperWorld - spec.upperBase) * toDegrees;
        const lower = (bend + spec.upperBase - spec.lowerBase) * toDegrees;
        return { upper, lower, foot: footWorldAngle - (upper + lower) };
      }

      function projectedPlantedRootY(
        side,
        contactX,
        contactY,
        rootX,
        kneeBendDegrees = 4,
        heelAngle = 0
      ) {
        const spec = projectedLegSpecs[side];
        const plantedKneeBend = kneeBendDegrees * Math.PI / 180;
        const bend = plantedKneeBend - spec.upperBase + spec.lowerBase;
        const reach = Math.sqrt(
          spec.upperLength * spec.upperLength + spec.lowerLength * spec.lowerLength
          + 2 * spec.upperLength * spec.lowerLength * Math.cos(bend)
        );
        const ankle = projectedAnkleForHeel(contactX, contactY, heelAngle);
        const horizontal = ankle.x - rootX - spec.hip.x;
        const vertical = Math.sqrt(Math.max(0, reach * reach - horizontal * horizontal));
        return ankle.y - spec.hip.y - vertical;
      }

      function poseProjectedWalk(now) {
        if (projectedWalkStartedAt === null) projectedWalkStartedAt = now;
        const seconds = Number.isFinite(fixedQaSeconds)
          ? Math.max(0, fixedQaSeconds)
          : (now - projectedWalkStartedAt) / 1000;
        const halfStepDuration = 0.68;
        const halfStepsPerLoop = 8;
        const stride = 180;
        const loopTime = seconds % (halfStepDuration * halfStepsPerLoop);
        const halfStep = Math.floor(loopTime / halfStepDuration);
        const progress = (loopTime / halfStepDuration) - halfStep;
        const smoothstep = value => {
          const x = Math.max(0, Math.min(1, value));
          return x * x * (3 - 2 * x);
        };
        const easeRange = (start, end) => smoothstep((progress - start) / (end - start));
        const doubleSupportEnd = 0.18;
        const swingPhase = Math.max(0, Math.min(1,
          (progress - doubleSupportEnd) / (1 - doubleSupportEnd)
        ));
        const eased = smoothstep(swingPhase);
        const direction = Math.sign(forwardScreenX) || 1;
        const signedStride = stride * direction;
        const travelStart = direction > 0 ? -430 : 430;
        const stepRootStart = travelStart + halfStep * signedStride;
        const torsoLead = 26 * direction * Math.sin(Math.PI * progress) ** 2;
        const rootX = stepRootStart + progress * signedStride + torsoLead;
        const leftIsPlanted = halfStep % 2 === 0;
        const plantedSide = leftIsPlanted ? 'left' : 'right';
        const swingingSide = leftIsPlanted ? 'right' : 'left';
        const plantedHipX = projectedLegSpecs[plantedSide].hip.x;
        const swingingHipX = projectedLegSpecs[swingingSide].hip.x;
        const plantedContact = stepRootStart + plantedHipX + signedStride * 0.5;
        const previousContact = stepRootStart + swingingHipX - signedStride * 0.5;
        const nextContact = stepRootStart + swingingHipX + signedStride * 1.5;
        const groundAnkleY = 1005;
        const plantedFootAngle = (-8 * (1 - easeRange(0, 0.16))
          + 18 * easeRange(0.58, 1)) * direction;
        const trailingToeOff = easeRange(0, doubleSupportEnd);
        const swingToeRecovery = easeRange(doubleSupportEnd, 0.50);
        const swingHeelPreparation = easeRange(0.85, 1);
        const swingingFootAngle = (progress < doubleSupportEnd
          ? 18 + 8 * trailingToeOff
          : 24 * (1 - swingToeRecovery) - 8 * swingHeelPreparation) * direction;
        const leftHeelAngle = leftIsPlanted ? plantedFootAngle : swingingFootAngle;
        const rightHeelAngle = leftIsPlanted ? swingingFootAngle : plantedFootAngle;
        const plantedHeelAngle = leftIsPlanted ? leftHeelAngle : rightHeelAngle;
        const plantedAnkle = projectedAnkleForHeel(plantedContact, groundAnkleY, plantedHeelAngle);
        const rootY = projectedPlantedRootY(
          plantedSide, plantedContact, groundAnkleY, rootX, 5
        ) - 2 * Math.sin(Math.PI * progress) ** 2;
        const swingingContact = previousContact + (nextContact - previousContact) * eased;
        const swingingY = groundAnkleY - 46 * Math.sin(Math.PI * swingPhase);
        const swingingHeelAngle = leftIsPlanted ? rightHeelAngle : leftHeelAngle;
        const swingingAnkle = projectedAnkleForHeel(swingingContact, swingingY, swingingHeelAngle);
        const plantedLeg = solveProjectedLeg(
          plantedSide,
          plantedAnkle.x,
          plantedAnkle.y,
          rootX,
          rootY,
          plantedHeelAngle
        );
        const swingingLeg = solveProjectedLeg(
          swingingSide,
          swingingAnkle.x,
          swingingAnkle.y,
          rootX,
          rootY,
          swingingHeelAngle
        );
        const leftLeg = leftIsPlanted ? plantedLeg : swingingLeg;
        const rightLeg = leftIsPlanted ? swingingLeg : plantedLeg;
        const gaitPhase = Math.cos(Math.PI * (halfStep + progress - 0.06));

        setRotation('rig-leg-left-upper', leftLeg.upper);
        setRotation('rig-leg-left-lower', leftLeg.lower);
        setRotation('rig-foot-left', 0);
        setRotation('rig-leg-right-upper', rightLeg.upper);
        setRotation('rig-leg-right-lower', rightLeg.lower);
        setRotation('rig-foot-right', 0);
        setRotation('rig-arm-' + frontSide + '-upper', gaitPhase * 12 * direction);
        setRotation(
          'rig-arm-' + frontSide + '-forearm',
          -8 - Math.max(0, gaitPhase * direction) * 5
        );
        setRotation('rig-upper-body', 0);
        window.__projectedWalkPhase = gaitPhase;
        rigPerson.setAttribute('transform', 'translate(' + rootX.toFixed(3) + ' ' + rootY.toFixed(3) + ')');
        rigPerson.dataset.walkTravelX = rootX.toFixed(3);
        rigPerson.dataset.plantedFoot = plantedSide;
        rigPerson.dataset.leftFootAngle = leftHeelAngle.toFixed(3);
        rigPerson.dataset.rightFootAngle = rightHeelAngle.toFixed(3);
        rigPerson.dataset.doubleSupport = String(progress < doubleSupportEnd);
        rigPerson.dataset.swingPhase = swingPhase.toFixed(3);
        rigPerson.dataset.gaitStancePercent = '62';
        rigPerson.dataset.gaitSwingPercent = '38';
        rigPerson.dataset.gaitMode = 'walk';
      }

      function poseProjectedRun(now) {
        if (projectedWalkStartedAt === null) projectedWalkStartedAt = now;
        const seconds = Number.isFinite(fixedQaSeconds)
          ? Math.max(0, fixedQaSeconds)
          : (now - projectedWalkStartedAt) / 1000;
        const halfStepDuration = 0.40;
        const halfStepsPerLoop = 10;
        const stride = 350;
        const dutyFactor = 0.20;
        const supportEnd = dutyFactor * 2;
        const loopTime = seconds % (halfStepDuration * halfStepsPerLoop);
        const halfStep = Math.floor(loopTime / halfStepDuration);
        const progress = (loopTime / halfStepDuration) - halfStep;
        const smoothstep = value => {
          const x = Math.max(0, Math.min(1, value));
          return x * x * x * (x * (x * 6 - 15) + 10);
        };
        const direction = Math.sign(forwardScreenX) || 1;
        const signedStride = stride * direction;
        const travelStart = direction > 0 ? -430 : 430;
        const stepRootStart = travelStart + halfStep * signedStride;
        const rootX = stepRootStart + progress * signedStride + 20 * direction;
        const leftIsContactLeg = halfStep % 2 === 0;
        const contactSide = leftIsContactLeg ? 'left' : 'right';
        const otherSide = leftIsContactLeg ? 'right' : 'left';
        const contactHipX = projectedLegSpecs[contactSide].hip.x;
        const otherHipX = projectedLegSpecs[otherSide].hip.x;
        const contactLegContact = stepRootStart + contactHipX + signedStride * 0.13;
        const otherPreviousContact = stepRootStart + otherHipX - signedStride * 0.87;
        const otherNextContact = stepRootStart + otherHipX + signedStride * 1.13;
        const groundAnkleY = 1005;

        const footState = (phase, previousContact, nextContact) => {
          if (phase < dutyFactor) {
            return { x: previousContact, y: groundAnkleY, stance: true };
          }
          const swingProgress = Math.max(0, Math.min(1,
            (phase - dutyFactor) / (1 - dutyFactor)
          ));
          const swingArc = Math.sin(Math.PI * swingProgress);
          return {
            x: previousContact + (nextContact - previousContact) * smoothstep(swingProgress),
            y: groundAnkleY - 150 * swingArc * swingArc,
            stance: false
          };
        };
        const footAngle = phase => {
          if (phase < dutyFactor) {
            const settle = smoothstep(phase / 0.08);
            const toeOff = smoothstep((phase - (dutyFactor - 0.16)) / 0.16);
            return (-2 * (1 - settle) + 24 * toeOff) * direction;
          }
          const swingProgress = (phase - dutyFactor) / (1 - dutyFactor);
          const recovery = smoothstep(swingProgress / 0.28);
          const landingPreparation = smoothstep((swingProgress - 0.82) / 0.18);
          return (24 * (1 - recovery) - 2 * landingPreparation) * direction;
        };

        const contactLegPhase = progress * 0.5;
        const otherLegPhase = 0.5 + progress * 0.5;
        const contactFoot = footState(
          contactLegPhase,
          contactLegContact,
          contactLegContact + signedStride * 2
        );
        const otherFoot = footState(otherLegPhase, otherPreviousContact, otherNextContact);
        const contactFootAngle = footAngle(contactLegPhase);
        const otherFootAngle = footAngle(otherLegPhase);

        if (progress > supportEnd) {
          const flightProgress = (progress - supportEnd) / (1 - supportEnd);
          const flightArc = Math.sin(Math.PI * flightProgress);
          const sharedFlightLift = 65 * flightArc * flightArc;
          contactFoot.y -= sharedFlightLift;
          otherFoot.y -= sharedFlightLift;
        }

        const stanceProgress = Math.min(1, progress / supportEnd);
        let rootY = projectedPlantedRootY(
          contactSide,
          contactLegContact,
          groundAnkleY,
          rootX,
          11,
          contactFootAngle
        )
          - 2 * Math.sin(Math.PI * stanceProgress) ** 2;
        if (progress > supportEnd) {
          const flightProgress = (progress - supportEnd) / (1 - supportEnd);
          const takeoffRootX = stepRootStart + supportEnd * signedStride + 20 * direction;
          const takeoffRootY = projectedPlantedRootY(
            contactSide,
            contactLegContact,
            groundAnkleY,
            takeoffRootX,
            11,
            footAngle(dutyFactor)
          );
          const landingRootX = stepRootStart + signedStride + 20 * direction;
          const landingRootY = projectedPlantedRootY(
            otherSide,
            otherNextContact,
            groundAnkleY,
            landingRootX,
            11,
            footAngle(0)
          );
          const flightArc = Math.sin(Math.PI * flightProgress);
          rootY = takeoffRootY
            + (landingRootY - takeoffRootY) * smoothstep(flightProgress)
            - 30 * flightArc * flightArc;
        }

        const leftFoot = leftIsContactLeg ? contactFoot : otherFoot;
        const rightFoot = leftIsContactLeg ? otherFoot : contactFoot;
        const leftHeelAngle = leftIsContactLeg ? contactFootAngle : otherFootAngle;
        const rightHeelAngle = leftIsContactLeg ? otherFootAngle : contactFootAngle;
        const leftAnkle = projectedAnkleForHeel(leftFoot.x, leftFoot.y, leftHeelAngle);
        const rightAnkle = projectedAnkleForHeel(rightFoot.x, rightFoot.y, rightHeelAngle);
        const leftLeg = solveProjectedLeg(
          'left', leftAnkle.x, leftAnkle.y, rootX, rootY, leftHeelAngle
        );
        const rightLeg = solveProjectedLeg(
          'right', rightAnkle.x, rightAnkle.y, rootX, rootY, rightHeelAngle
        );
        const gaitPhase = Math.cos(Math.PI * (halfStep + progress));

        setRotation('rig-leg-left-upper', leftLeg.upper);
        setRotation('rig-leg-left-lower', leftLeg.lower);
        setRotation('rig-foot-left', 0);
        setRotation('rig-leg-right-upper', rightLeg.upper);
        setRotation('rig-leg-right-lower', rightLeg.lower);
        setRotation('rig-foot-right', 0);
        setRotation('rig-arm-' + frontSide + '-upper', gaitPhase * 32 * direction);
        setRotation(
          'rig-arm-' + frontSide + '-forearm',
          -38 - Math.max(0, gaitPhase * direction) * 12
        );
        // Lean from the connected hip pivot: the torso must not slide away
        // from the pelvis as a separate block.
        setUpperBodyPose(14 * direction);
        window.__projectedWalkPhase = gaitPhase;
        rigPerson.setAttribute('transform', 'translate(' + rootX.toFixed(3) + ' ' + rootY.toFixed(3) + ')');
        rigPerson.dataset.walkTravelX = rootX.toFixed(3);
        rigPerson.dataset.plantedFoot = contactFoot.stance ? contactSide : 'none';
        rigPerson.dataset.leftFootAngle = leftHeelAngle.toFixed(3);
        rigPerson.dataset.rightFootAngle = rightHeelAngle.toFixed(3);
        rigPerson.dataset.doubleSupport = 'false';
        rigPerson.dataset.flightPhase = String(progress > supportEnd);
        rigPerson.dataset.leftLegPhase = (leftIsContactLeg ? contactLegPhase : otherLegPhase).toFixed(3);
        rigPerson.dataset.rightLegPhase = (leftIsContactLeg ? otherLegPhase : contactLegPhase).toFixed(3);
          rigPerson.dataset.gaitStancePercent = '20';
          rigPerson.dataset.gaitSwingPercent = '80';
        rigPerson.dataset.gaitMode = 'run';
      }

      function poseProjectedWork(now, requestedPose = 'deep-squat') {
        if (projectedWalkStartedAt === null) projectedWalkStartedAt = now;
        const seconds = Number.isFinite(fixedQaSeconds)
          ? Math.max(0, fixedQaSeconds)
          : (now - projectedWalkStartedAt) / 1000;
        const poses = [
          { name: 'deep-squat', rootY: 190, torso: 42, frameX: -117, frameY: -266, scale: 1.09, leftUpper: -70, leftLower: 70, rightUpper: -76, rightLower: 76, leftArm: -45, leftElbow: -20, rightArm: -20, rightElbow: -60 },
          { name: 'one-knee', rootY: 220, torso: 40, frameX: -4, frameY: -150, scale: .95, leftUpper: -80, leftLower: 100, rightUpper: 0, rightLower: 90, leftArm: -45, leftElbow: -20, rightArm: -20, rightElbow: -60 },
          { name: 'farmer-pull', rootY: 220, torso: 40, frameX: -4, frameY: -150, scale: .95, leftUpper: -80, leftLower: 100, rightUpper: 0, rightLower: 90, leftArm: -84, leftElbow: 20, rightArm: -74, rightElbow: 74 },
          { name: 'farmer-tend', rootY: 190, torso: 42, frameX: -117, frameY: -266, scale: 1.09, leftUpper: -70, leftLower: 70, rightUpper: -76, rightLower: 76, leftArm: -88, leftElbow: 20, rightArm: -84, rightElbow: 76 }
        ];
        const current = poses.find(pose => pose.name === requestedPose) || poses[0];
        const working = Math.sin(seconds * Math.PI * 2 * 1.5);
        const direction = Math.sign(forwardScreenX) || 1;

        setRotation('rig-leg-left-upper', current.leftUpper * direction);
        setRotation('rig-leg-left-lower', current.leftLower * direction);
        setRotation('rig-foot-left', 0);
        setRotation('rig-leg-right-upper', current.rightUpper * direction);
        setRotation('rig-leg-right-lower', current.rightLower * direction);
        setRotation('rig-foot-right', 0);

        // Both elbows remain outside the torso; the forearms and wrists perform
        // the repeated working action over the ground-level bricks.
        setRotation('rig-arm-left-upper', current.leftArm + working * 1.2);
        setRotation('rig-arm-left-forearm', current.leftElbow + working * 4);
        setRotation('rig-hand-left', working * 3);
        setRotation('rig-arm-right-upper', current.rightArm - working * 1.2);
        setRotation('rig-arm-right-forearm', current.rightElbow - working * 4);
        setRotation('rig-hand-right', -working * 3);
        const torsoAngle = current.torso * direction;
        const torsoAxisRadians = torsoAngle * Math.PI / 180;
        const torsoAdvance = 50;
        setUpperBodyPose(
          torsoAngle,
          -Math.sin(torsoAxisRadians) * torsoAdvance,
          Math.cos(torsoAxisRadians) * torsoAdvance
        );

        const rootY = current.rootY;
        rigPerson.setAttribute(
          'transform',
          'translate(' + current.frameX + ' ' + current.frameY + ') scale(' + current.scale + ') translate('
            + (-100 * direction).toFixed(3) + ' ' + rootY.toFixed(3) + ')'
        );
        document.documentElement.setAttribute('viewBox', '0 0 720 1040');
        document.documentElement.setAttribute('width', '720');
        document.documentElement.setAttribute('height', '1040');
        rigPerson.dataset.walkTravelX = '0.000';
        rigPerson.dataset.gaitMode = 'work-' + current.name;
        rigPerson.dataset.workAmount = '1.000';
        rigPerson.dataset.workPhase = working.toFixed(3);
        rigPerson.dataset.workPose = current.name;
        workHead.setAttribute('visibility', 'visible');
        workObject.setAttribute('visibility', 'visible');
        workObject.setAttribute('opacity', '1');
        workGroundForeground.setAttribute('visibility', 'visible');
      }

      function poseProjectedNeutralLegStance() {
        const mode = location.hash.slice(1);
        if (mode === 'walk' || mode === 'run' || mode === 'wave' || mode === 'work' || mode.startsWith('work-')) return;
        setRotation('rig-leg-left-upper', backSide === 'left' ? 2 : 3);
        setRotation('rig-leg-right-upper', backSide === 'right' ? -2 : -3);
        setRotation('rig-leg-left-lower', 0);
        setRotation('rig-leg-right-lower', 0);
        setRotation('rig-foot-left', 0);
        setRotation('rig-foot-right', 0);
      }

      function poseProjectedBackArm() {
        const mode = location.hash.slice(1);
        if (mode === 'wave' || mode === 'work' || mode.startsWith('work-')) return;
        const forearmId = 'rig-arm-' + backSide + '-forearm';
        const shoulder = document.getElementById('rig-arm-' + backSide + '-upper').dataset;
        const elbow = document.getElementById(forearmId).dataset;
        const wrist = document.getElementById('rig-hand-' + backSide).dataset;
        const axisDegrees = (a, b) => Math.atan2(
          Number(b.pivotY) - Number(a.pivotY),
          Number(b.pivotX) - Number(a.pivotX)
        ) * 180 / Math.PI;
        const signedDegrees = degrees => ((degrees + 540) % 360) - 180;
        const authoredRelativeDegrees = signedDegrees(
          axisDegrees(elbow, wrist) - axisDegrees(shoulder, elbow)
        );
        const upperArmId = 'rig-arm-' + backSide + '-upper';
        const authoredShoulderFromDown = Math.atan2(
          Number(elbow.pivotX) - Number(shoulder.pivotX),
          Number(elbow.pivotY) - Number(shoulder.pivotY)
        ) * 180 / Math.PI;
        const targetShoulderFromDown = backSide === 'right' ? 2 : -2;
        const gaitPhase = mode === 'walk' || mode === 'run'
          ? Number(window.__projectedWalkPhase || 0)
          : 0;
        const shoulderSwing = mode === 'run' ? 32 : 12;
        const elbowSwing = mode === 'run' ? 12 : 5;
        const rearShoulderSwingDirection = backSide === 'right' ? 1 : -1;
        setRotation(
          upperArmId,
          authoredShoulderFromDown - targetShoulderFromDown
            - gaitPhase * shoulderSwing * rearShoulderSwingDirection
        );
        let targetRelativeDegrees = mode === 'run' ? -36 : -15;
        if (mode === 'walk' || mode === 'run') {
          targetRelativeDegrees -= gaitPhase * elbowSwing * rearShoulderSwingDirection;
        }
        const requiredLocalRotation = targetRelativeDegrees - authoredRelativeDegrees;
        setRotation(forearmId, requiredLocalRotation);
      }

      function syncInheritedTransforms(now) {
        const mode = location.hash.slice(1);
        if (mode === 'walk') {
          poseProjectedWalk(now);
          poseProjectedBackArm();
        } else if (mode === 'run') {
          poseProjectedRun(now);
          poseProjectedBackArm();
        } else if (mode === 'work' || mode.startsWith('work-')) {
          poseProjectedWork(now, mode === 'work' ? 'deep-squat' : mode.slice(5));
        } else {
          poseProjectedBackArm();
          poseProjectedNeutralLegStance();
          projectedWalkStartedAt = null;
          rigPerson.setAttribute('transform', 'translate(0 0)');
          rigPerson.dataset.walkTravelX = '0.000';
          delete rigPerson.dataset.plantedFoot;
          delete rigPerson.dataset.leftFootAngle;
          delete rigPerson.dataset.rightFootAngle;
          delete rigPerson.dataset.doubleSupport;
          delete rigPerson.dataset.swingPhase;
          delete rigPerson.dataset.flightPhase;
          delete rigPerson.dataset.gaitMode;
          delete rigPerson.dataset.leftLegPhase;
          delete rigPerson.dataset.rightLegPhase;
          delete rigPerson.dataset.gaitStancePercent;
          delete rigPerson.dataset.gaitSwingPercent;
          delete rigPerson.dataset.workAmount;
          delete rigPerson.dataset.workPhase;
          workObject.setAttribute('visibility', 'hidden');
          workObject.setAttribute('opacity', '0');
          workHead.setAttribute('visibility', 'hidden');
          workGroundForeground.setAttribute('visibility', 'hidden');
          document.documentElement.setAttribute('viewBox', '-80 0 880 1080');
          document.documentElement.setAttribute('width', '880');
          document.documentElement.setAttribute('height', '1080');
        }
        for (const [wrapperId, chain] of Object.entries(inheritedRigTransforms)) {
          const wrapper = document.getElementById(wrapperId);
          if (!wrapper) continue;
          const outer = chain.outer
            .map(id => document.getElementById(id)?.getAttribute('transform'))
            .filter(Boolean);
          const joints = chain.joints
            .map(id => document.getElementById(id)?.getAttribute('transform'))
            .filter(Boolean);
          wrapper.setAttribute('transform', [...outer, wrapper.dataset.baseTransform, ...joints].join(' '));
        }
        if (!Number.isFinite(fixedQaSeconds)) {
          requestAnimationFrame(syncInheritedTransforms);
        }
      }
      requestAnimationFrame(syncInheritedTransforms);
    })();
  ]]></script>
`;

if (!source.includes('</svg>')) throw new Error('Front SVG has no closing </svg> tag.');
const sourceWalkOcclusionCode = `          setWalkFrontArm(armPhase >= 0 ? 'right' : 'left');`;
const projectedWalkHook = `          window.__projectedWalkPhase = armPhase;`;
if (!source.includes(sourceWalkOcclusionCode)) throw new Error('Front SVG walk hook changed unexpectedly.');
const projectedSource = source.replace(sourceWalkOcclusionCode, projectedWalkHook);
const output = projectedSource.replace('</svg>', `${projectionRuntime}</svg>`);
fs.writeFileSync(outputPath, output);
console.log(`Generated ${path.relative(process.cwd(), outputPath)} from immutable front geometry.`);
