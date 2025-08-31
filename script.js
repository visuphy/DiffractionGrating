document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('simulationCanvas');
    const ctx = canvas.getContext('2d');

    // Get all interactive elements
    const wavelengthSlider = document.getElementById('wavelength');
    const angleSlider = document.getElementById('angle');
    const gratingSpacingSlider = document.getElementById('gratingSpacing');
    const grooveDensitySlider = document.getElementById('grooveDensity');
    const ordersSlider = document.getElementById('orders');
    const groovesSlider = document.getElementById('grooves');
    const gratingTypeRadios = document.querySelectorAll('input[name="gratingType"]');
    const lightTypeRadios = document.querySelectorAll('input[name="lightType"]');
    const bandwidthSlider = document.getElementById('bandwidth');

    // Monochromatic controls
    const monoControls = document.getElementById('monoControls');
    const minWavelengthInput = document.getElementById('minWavelength');
    const maxWavelengthInput = document.getElementById('maxWavelength');
    const updateWavelengthBtn = document.getElementById('updateWavelengthRange');
    
    // Text input boxes for sliders
    const wavelengthInput = document.getElementById('wavelengthInput');
    const bandwidthInput = document.getElementById('bandwidthInput');
    const angleInput = document.getElementById('angleInput');
    const gratingSpacingInput = document.getElementById('gratingSpacingInput');
    const grooveDensityInput = document.getElementById('grooveDensityInput');
    const ordersInput = document.getElementById('ordersInput');
    const groovesInput = document.getElementById('groovesInput');

    const gratingCenter = { x: canvas.width / 2, y: canvas.height / 2 };
    const BEAM_LENGTH = canvas.width;

    let diffractedRays = [];
    let selectedRay = null;

    function updateSpacingFromDensity() {
        const density = parseInt(grooveDensitySlider.value);
        const newSpacing = Math.round(1000000 / density);
        gratingSpacingSlider.value = newSpacing;
        grooveDensityInput.value = density;
        gratingSpacingInput.value = newSpacing;
    }

    function updateDensityFromSpacing() {
        const spacing = parseInt(gratingSpacingSlider.value);
        const newDensity = Math.round(1000000 / spacing);
        grooveDensitySlider.value = newDensity;
        gratingSpacingInput.value = spacing;
        grooveDensityInput.value = newDensity;
    }

    function draw() {
        const incidentAngleDegrees = parseInt(angleSlider.value);
        const gratingSpacingNM = parseInt(gratingSpacingSlider.value);
        const maxOrder = parseInt(ordersSlider.value);
        const numGrooves = parseInt(groovesSlider.value);
        const gratingType = document.querySelector('input[name="gratingType"]:checked').value;
        const lightType = document.querySelector('input[name="lightType"]:checked').value;
        const wavelengthNM = parseInt(wavelengthSlider.value);
        const bandwidthNM = parseInt(bandwidthSlider.value);
        
        const alpha = incidentAngleDegrees * (Math.PI / 180);
        const d = gratingSpacingNM;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        diffractedRays = [];
        
        const tempRays = [];
        const smears = [];
        const labels = [];
        
        if (lightType === 'monochromatic') {
            const startLambda = wavelengthNM - bandwidthNM / 2;
            const endLambda = wavelengthNM + bandwidthNM / 2;
            for (let m = -maxOrder; m <= maxOrder; m++) {
                const sin_beta_center = calculateSinBeta(m, wavelengthNM, d, alpha, gratingType);
                if (sin_beta_center >= -1 && sin_beta_center <= 1) {
                    const beta_center = Math.asin(sin_beta_center);
                    const path = createRayPath(beta_center, gratingType);
                    tempRays.push({ order: m, angleDegrees: beta_center * (180 / Math.PI), path: path });
                    labels.push({ order: m, beta: beta_center });
                }
                if (bandwidthNM > 0) {
                    for (let lambda = startLambda; lambda <= endLambda; lambda += 2) {
                        const sin_beta = calculateSinBeta(m, lambda, d, alpha, gratingType);
                        if (sin_beta >= -1 && sin_beta <= 1) {
                            const hue = 270 - ((lambda - 380) / (750 - 380)) * 270;
                            smears.push({ beta: Math.asin(sin_beta), color: `hsl(${hue}, 100%, 50%)`, lineWidth: 1 });
                        }
                    }
                }
            }
        } else { 
            for (let m = -maxOrder; m <= maxOrder; m++) {
                if (m === 0) {
                    const sin_beta = calculateSinBeta(0, 550, d, alpha, gratingType);
                    if (sin_beta >= -1 && sin_beta <= 1) {
                        smears.push({ beta: Math.asin(sin_beta), color: '#FFFFFF', lineWidth: 3, order: 0 });
                    }
                } else {
                    for (let lambda = 380; lambda <= 750; lambda += 5) {
                        const sin_beta = calculateSinBeta(m, lambda, d, alpha, gratingType);
                        if (sin_beta >= -1 && sin_beta <= 1) {
                            const hue = 270 - ((lambda - 380) / (750 - 380)) * 270;
                            smears.push({ beta: Math.asin(sin_beta), color: `hsl(${hue}, 100%, 50%)`, lineWidth: 2 });
                        }
                    }
                }
                const sin_beta_label = calculateSinBeta(m, 550, d, alpha, gratingType);
                if (sin_beta_label >= -1 && sin_beta_label <= 1) {
                    labels.push({ order: m, beta: Math.asin(sin_beta_label) });
                }
            }
        }

        diffractedRays = tempRays;
        if (selectedRay) {
            selectedRay = diffractedRays.find(ray => ray.order === selectedRay.order) || null;
        }

        ctx.fillStyle = '#cccccc';
        ctx.fillRect(gratingCenter.x - 200, gratingCenter.y, 400, 5);
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 1;
        ctx.moveTo(gratingCenter.x, 0);
        ctx.lineTo(gratingCenter.x, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);
        
        let beamColor = '#FFFFFF';
        if (lightType === 'monochromatic') {
            const centralHue = 270 - ((wavelengthNM - 380) / (750 - 380)) * 270;
            beamColor = `hsl(${centralHue}, 100%, 50%)`;
        }
        drawIncidentBeam(alpha, beamColor);

        smears.forEach(smear => {
             const y_direction = (gratingType === 'reflective') ? -1 : 1;
             const endX = gratingCenter.x + BEAM_LENGTH * Math.sin(smear.beta);
             const endY = gratingCenter.y + y_direction * BEAM_LENGTH * Math.cos(smear.beta);
             ctx.strokeStyle = smear.color;
             ctx.lineWidth = smear.lineWidth;
             ctx.beginPath();
             ctx.moveTo(gratingCenter.x, gratingCenter.y);
             ctx.lineTo(endX, endY);
             ctx.stroke();
        });

        if (lightType === 'monochromatic') {
             diffractedRays.forEach(ray => {
                 drawRay(Math.asin(calculateSinBeta(ray.order, wavelengthNM, d, alpha, gratingType)), gratingType, beamColor, 2, ray.order);
             });
        }
        
        labels.forEach(label => {
            drawOrderLabel(label.order, label.beta, gratingType);
        });

        if (lightType === 'monochromatic') {
            highlightAndDisplayData(wavelengthNM, d, numGrooves);
        }
    }
    
    function createRayPath(beta, gratingType) {
        const y_direction = (gratingType === 'reflective') ? -1 : 1;
        const endX = gratingCenter.x + BEAM_LENGTH * Math.sin(beta);
        const endY = gratingCenter.y + y_direction * BEAM_LENGTH * Math.cos(beta);
        const path = new Path2D();
        path.moveTo(gratingCenter.x, gratingCenter.y);
        path.lineTo(endX, endY);
        return path;
    }

    function calculateSinBeta(m, lambda, d, alpha, gratingType) {
        return Math.sin(alpha) - (m * lambda / d);
    }

    function drawLaserPointer(sourceX, sourceY, angle) {
        const length = 60;
        const width = 20;
        const dirX = Math.sin(angle);
        const dirY = Math.cos(angle);
        const perpX = -dirY;
        const perpY = dirX;
        const backX = sourceX - dirX * length;
        const backY = sourceY - dirY * length;
        const halfWidth = width / 2;
        const corner1X = backX + perpX * halfWidth;
        const corner1Y = backY + perpY * halfWidth;
        const corner2X = backX - perpX * halfWidth;
        const corner2Y = backY - perpY * halfWidth;
        const corner3X = sourceX - perpX * halfWidth;
        const corner3Y = sourceY - perpY * halfWidth;
        const corner4X = sourceX + perpX * halfWidth;
        const corner4Y = sourceY + perpY * halfWidth;
        
        ctx.fillStyle = '#333333';
        ctx.beginPath();
        ctx.moveTo(corner1X, corner1Y);
        ctx.lineTo(corner2X, corner2Y);
        ctx.lineTo(corner3X, corner3Y);
        ctx.lineTo(corner4X, corner4Y);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#888888';
        ctx.beginPath();
        ctx.arc(sourceX, sourceY, halfWidth, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sourceX, sourceY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(backX, backY, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawArrow(ctx, x, y, angle, size, color) {
        const arrowSize = size || 8;
        const arrowAngle = Math.PI / 6; 
        
        ctx.save();
        ctx.translate(x, y);
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-arrowSize * Math.cos(angle - arrowAngle), -arrowSize * Math.sin(angle - arrowAngle));
        ctx.lineTo(-arrowSize * Math.cos(angle + arrowAngle), -arrowSize * Math.sin(angle + arrowAngle));
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    function drawIncidentBeam(alpha, color) {
        const laserDistance = Math.min(canvas.width, canvas.height) * 0.4;
        const sourceX = gratingCenter.x - laserDistance * Math.sin(alpha);
        const sourceY = gratingCenter.y - laserDistance * Math.cos(alpha);
        
        drawLaserPointer(sourceX, sourceY, alpha);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sourceX, sourceY);
        ctx.lineTo(gratingCenter.x, gratingCenter.y);
        ctx.stroke();
        
        const dx = gratingCenter.x - sourceX;
        const dy = gratingCenter.y - sourceY;
        const beamAngle = Math.atan2(dy, dx);
        
        const arrowDistance = laserDistance * 0.7;
        const arrowX = gratingCenter.x - arrowDistance * Math.sin(alpha);
        const arrowY = gratingCenter.y - arrowDistance * Math.cos(alpha);
        drawArrow(ctx, arrowX, arrowY, beamAngle, 8, color);
    }

    function drawRay(beta, gratingType, color, lineWidth, order) {
        const isSelected = selectedRay && selectedRay.order === order;
        ctx.strokeStyle = isSelected ? '#FFFF00' : color;
        ctx.lineWidth = isSelected ? 4 : lineWidth;
        const y_direction = (gratingType === 'reflective') ? -1 : 1;
        const path = createRayPath(beta, gratingType);
        ctx.stroke(path);
        
        const arrowDistance = BEAM_LENGTH * 0.3;
        const arrowX = gratingCenter.x + arrowDistance * Math.sin(beta);
        const arrowY = gratingCenter.y + y_direction * arrowDistance * Math.cos(beta);
        
        let arrowAngle = Math.atan2(y_direction * Math.cos(beta), Math.sin(beta));
        
        drawArrow(ctx, arrowX, arrowY, arrowAngle, 6, isSelected ? '#FFFF00' : color);
        
        return path;
    }
    
    function drawOrderLabel(order, beta, gratingType) {
        const isSelected = selectedRay && selectedRay.order === order;
        ctx.fillStyle = isSelected ? '#FFFF00' : '#ffffff';
        const y_direction = (gratingType === 'reflective') ? -1 : 1;
        ctx.font = '14px Arial';
        const labelX = gratingCenter.x + 250 * Math.sin(beta);
        const labelY = gratingCenter.y + y_direction * 250 * Math.cos(beta);
        ctx.fillText(`m = ${order}`, labelX, labelY);
    }
    
    function highlightAndDisplayData(lambda, d, numGrooves) {
        const incidentAngleDegrees = parseInt(angleSlider.value);
        const alpha_rad = incidentAngleDegrees * (Math.PI / 180);

        ctx.fillStyle = '#A0B8FF';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Littrow Condition (for m=1):', 20, canvas.height - 70);

        ctx.font = '16px Arial';
        const littrowWavelength = 2 * d * Math.sin(alpha_rad); 
        ctx.fillText(`Wavelength for α=${incidentAngleDegrees}°: ${littrowWavelength.toFixed(1)} nm`, 20, canvas.height - 45);

        const sin_alpha_L = lambda / (2 * d);
        if (Math.abs(sin_alpha_L) <= 1) {
            const littrowAngle_deg = Math.asin(sin_alpha_L) * (180 / Math.PI);
            ctx.fillText(`Angle for λ=${lambda}nm: ${littrowAngle_deg.toFixed(2)}°`, 20, canvas.height - 20);
        } else {
            ctx.fillText(`Angle for λ=${lambda}nm: Not Possible`, 20, canvas.height - 20);
        }

        if (selectedRay) {
            ctx.fillStyle = '#FFFF00';
            ctx.font = '16px Arial';
            ctx.textAlign = 'left';

            const m = selectedRay.order;
            const beta_rad = selectedRay.angleDegrees * (Math.PI / 180);
            ctx.fillText(`Diffraction angle for m=${m}: ${selectedRay.angleDegrees.toFixed(2)}°`, 20, 30);
            
            const cos_beta = Math.cos(beta_rad);
            if (cos_beta !== 0 && m !== 0) {
                const dispersion_rad_nm = Math.abs(m / (d * cos_beta));
                const dispersion_deg_nm = dispersion_rad_nm * (180 / Math.PI);
                ctx.fillText(`Angular Dispersion: ${dispersion_deg_nm.toFixed(4)} °/nm`, 20, 55);

                const c = 299792458;
                const lambda_m = lambda * 1e-9;
                const d_m = d * 1e-9;
                
                const gvd_numerator = -1 * Math.pow(m, 2) * Math.pow(lambda_m, 3);
                const gvd_denominator = 2 * Math.PI * Math.pow(c, 2) * Math.pow(d_m, 2) * Math.pow(cos_beta, 3);
                const gvd_s2_m = gvd_denominator === 0 ? 0 : gvd_numerator / gvd_denominator;
                const gvd_ps2_m = gvd_s2_m * 1e24;
                ctx.fillText(`Temporal Dispersion: ${gvd_ps2_m.toExponential(3)} ps²/m`, 20, 80);

                const resolvingPower = Math.abs(m * numGrooves);
                const deltaLambda = lambda / resolvingPower;
                ctx.fillText(`Resolving Power: ${Math.round(resolvingPower)}`, 20, 105);
                ctx.fillText(`Min Resolvable Δλ: ${deltaLambda.toFixed(4)} nm`, 20, 130);
            }
        }
    }
    
    function updateUI() {
        const lightType = document.querySelector('input[name="lightType"]:checked').value;
        monoControls.style.display = (lightType === 'monochromatic') ? 'flex' : 'none';
        draw();
    }

    function updateWavelengthRange() {
        const minVal = parseInt(minWavelengthInput.value);
        const maxVal = parseInt(maxWavelengthInput.value);
        if (isNaN(minVal) || isNaN(maxVal) || minVal >= maxVal || minVal < 1) {
            alert("Invalid range: Minimum must be a positive number and less than the maximum.");
            minWavelengthInput.value = wavelengthSlider.min;
            maxWavelengthInput.value = wavelengthSlider.max;
            return;
        }
        wavelengthSlider.min = minVal;
        wavelengthSlider.max = maxVal;
        
        let currentWavelength = parseInt(wavelengthSlider.value);
        if (currentWavelength < minVal) wavelengthSlider.value = minVal;
        if (currentWavelength > maxVal) wavelengthSlider.value = maxVal;
        
        wavelengthInput.value = wavelengthSlider.value;
        draw();
    }
    
    canvas.addEventListener('click', (event) => {
        const lightType = document.querySelector('input[name="lightType"]:checked').value;
        if (lightType === 'whiteLight' || diffractedRays.length === 0) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        let clickedRay = null;
        for (let i = diffractedRays.length - 1; i >= 0; i--) {
            ctx.lineWidth = 10;
            if (ctx.isPointInStroke(diffractedRays[i].path, mouseX, mouseY)) {
                clickedRay = diffractedRays[i];
                break;
            }
        }

        if (clickedRay) {
            selectedRay = (selectedRay && selectedRay.order === clickedRay.order) ? null : clickedRay;
        } else {
            selectedRay = null;
        }
        draw();
    });
    
    const controlMap = [
        { slider: wavelengthSlider, input: wavelengthInput },
        { slider: bandwidthSlider, input: bandwidthInput },
        { slider: angleSlider, input: angleInput },
        { slider: gratingSpacingSlider, input: gratingSpacingInput, onchange: updateDensityFromSpacing },
        { slider: grooveDensitySlider, input: grooveDensityInput, onchange: updateSpacingFromDensity },
        { slider: ordersSlider, input: ordersInput },
        { slider: groovesSlider, input: groovesInput },
    ];

    controlMap.forEach(({ slider, input, onchange }) => {
        slider.addEventListener('input', () => {
            input.value = slider.value;
            if (onchange) onchange();
        });
        
        input.addEventListener('change', () => {
            let value = parseFloat(input.value);
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);

            if (slider === wavelengthSlider) {
                if (isNaN(value) || value < 1) {
                    input.value = slider.value;
                    return;
                }
                const range = 200;
                const newMin = Math.max(1, value - range);
                const newMax = value + range;
                
                minWavelengthInput.value = newMin;
                maxWavelengthInput.value = newMax;
                
                slider.min = newMin;
                slider.max = newMax;
                slider.value = value;

            } else {
                if (value < min) value = min;
                if (value > max) value = max;
                input.value = value;
                slider.value = value;
            }
           
            if (onchange) onchange();
            draw();
        });
    });

    const allSliders = controlMap.map(item => item.slider);
    allSliders.forEach(slider => slider.addEventListener('input', draw));

    const resets = [...gratingTypeRadios, ...lightTypeRadios];
    resets.forEach(control => control.addEventListener('input', () => {
        selectedRay = null;
        updateUI(); 
    }));
    
    updateWavelengthBtn.addEventListener('click', updateWavelengthRange);

    updateDensityFromSpacing();
    updateUI();
});