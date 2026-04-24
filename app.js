document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('clinical-form');
    const demoBtn = document.getElementById('fill-demo-btn');
    
    // UI Elements for Results
    const emptyState = document.getElementById('empty-state');
    const loadingState = document.getElementById('loading-state');
    const resultsContent = document.getElementById('results-content');
    
    const riskPercentage = document.getElementById('risk-percentage');
    const riskBadge = document.getElementById('risk-badge');
    const clinicalSummary = document.getElementById('clinical-summary');
    const factorsList = document.getElementById('factors-list');
    const recsList = document.getElementById('recs-list');
    const dialCircle = document.querySelector('.dial-circle');

    // Fill Demo Data
    demoBtn.addEventListener('click', () => {
        document.getElementById('age').value = 63;
        document.getElementById('sex').value = "1";
        document.getElementById('trestbps').value = 145;
        document.getElementById('chol').value = 233;
        document.getElementById('fbs').value = "1";
        document.getElementById('cp').value = "1";
        document.getElementById('restecg').value = "2";
        document.getElementById('thalach').value = 150;
        document.getElementById('exang').value = "0";
        document.getElementById('oldpeak').value = 2.3;
        document.getElementById('slope').value = "3";
        document.getElementById('ca').value = "0";
        document.getElementById('thal').value = "6";
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Hide empty state and show loading
        emptyState.classList.add('hidden');
        resultsContent.classList.add('hidden');
        loadingState.classList.remove('hidden');
        
        // Gather data
        const formData = new FormData(form);
        const features = {
            age: parseFloat(formData.get('age')),
            sex: parseInt(formData.get('sex')),
            cp: parseInt(formData.get('cp')),
            trestbps: parseFloat(formData.get('trestbps')),
            chol: parseFloat(formData.get('chol')),
            fbs: parseInt(formData.get('fbs')),
            restecg: parseInt(formData.get('restecg')),
            thalach: parseFloat(formData.get('thalach')),
            exang: parseInt(formData.get('exang')),
            oldpeak: parseFloat(formData.get('oldpeak')),
            slope: parseInt(formData.get('slope')),
            ca: parseInt(formData.get('ca')),
            thal: parseInt(formData.get('thal'))
        };

        // Simulate API call / Model Inference
        setTimeout(() => {
            const result = calculateRisk(features);
            displayResults(result, features);
        }, 1500);
    });

    function calculateRisk(f) {
        // This is a proxy risk calculator loosely based on known clinical weights of UCI dataset features.
        // In a production app, this would be an API call to a trained ML model (e.g. Logistic Regression/Random Forest).
        let score = 0;
        let factors = [];
        let recs = [];

        // Age & Sex
        if (f.age > 60) { score += 10; factors.push({text: "Advanced Age (>60 yrs)", type: "warning"}); }
        if (f.sex === 1) { score += 10; factors.push({text: "Male biological sex is a baseline risk factor", type: "warning"}); }

        // Chest Pain
        if (f.cp === 4) { 
            score += 25; factors.push({text: "Asymptomatic pattern with other indicators", type: "critical"}); 
        } else if (f.cp === 1 || f.cp === 2) {
            score += 15; factors.push({text: "Presence of Angina (Typical/Atypical)", type: "critical"});
        } else {
            factors.push({text: "Non-anginal chest pain", type: "good"});
        }

        // Vitals / Labs
        if (f.trestbps > 140) { score += 10; factors.push({text: `Elevated resting BP (${f.trestbps} mmHg)`, type: "warning"}); }
        if (f.chol > 240) { score += 10; factors.push({text: `High Serum Cholesterol (${f.chol} mg/dl)`, type: "warning"}); }
        if (f.fbs === 1) { score += 5; factors.push({text: "Fasting Blood Sugar > 120 mg/dl", type: "warning"}); }

        // ECG / Exercise
        if (f.restecg === 2) { score += 10; factors.push({text: "LVH detected on resting ECG", type: "warning"}); }
        if (f.thalach < 120 && f.age < 70) { score += 5; } // Low max heart rate
        if (f.exang === 1) { score += 15; factors.push({text: "Exercise-induced angina present", type: "critical"}); }
        
        if (f.oldpeak > 2.0) { score += 15; factors.push({text: `Significant ST Depression (${f.oldpeak} mm)`, type: "critical"}); }
        else if (f.oldpeak > 0) { score += 5; }

        if (f.slope === 2) { score += 10; factors.push({text: "Flat peak exercise ST segment", type: "warning"}); }
        else if (f.slope === 3) { score += 15; factors.push({text: "Downsloping peak exercise ST segment", type: "critical"}); }

        // Fluoroscopy / Thallium
        if (f.ca > 0) { score += (f.ca * 10); factors.push({text: `${f.ca} major vessel(s) colored by fluoroscopy`, type: "critical"}); }
        if (f.thal === 6) { score += 15; factors.push({text: "Fixed defect on thallium scintigraphy", type: "warning"}); }
        if (f.thal === 7) { score += 25; factors.push({text: "Reversible defect on thallium scintigraphy (Ischemia)", type: "critical"}); }

        // Normalize score to percentage (0 - 99%)
        // The max possible proxy score above is ~175. We map it logarithmically/linearly to a probability.
        let probability = Math.min(Math.round((score / 150) * 100), 99);
        if (probability < 5) probability = Math.floor(Math.random() * 5) + 1; // Base noise

        // Determine Risk Category
        let category = 'low';
        if (probability >= 60) {
            category = 'high';
            recs = [
                "Immediate cardiology consult recommended.",
                "Consider Invasive Coronary Angiography (ICA) to confirm stenosis.",
                "Optimize medical therapy (Statins, Beta-blockers, Aspirin) aggressively.",
                "Monitor for acute coronary syndrome symptoms."
            ];
        } else if (probability >= 30) {
            category = 'moderate';
            recs = [
                "Schedule follow-up appointment within 2 weeks.",
                "Consider non-invasive imaging (CTCA or Stress Echo) for further evaluation.",
                "Review and optimize lipid profile and blood pressure control.",
                "Advise lifestyle modifications (Diet, Exercise, Smoking cessation)."
            ];
        } else {
            category = 'low';
            recs = [
                "Reassure patient; low probability of significant coronary artery stenosis.",
                "Continue routine preventative care.",
                "Focus on primary prevention and lifestyle maintenance."
            ];
            // Provide a good factor if empty
            if (!factors.some(f => f.type === 'good')) {
                factors.push({text: "Most clinical parameters within normal limits.", type: "good"});
            }
        }

        // Sort factors: critical first, then warning, then good
        factors.sort((a, b) => {
            const val = { 'critical': 3, 'warning': 2, 'good': 1 };
            return val[b.type] - val[a.type];
        });

        return { probability, category, factors, recs };
    }

    function displayResults(result, features) {
        loadingState.classList.add('hidden');
        resultsContent.classList.remove('hidden');

        // Update Dial
        riskPercentage.textContent = `${result.probability}%`;
        dialCircle.style.borderColor = 
            result.category === 'high' ? 'var(--risk-high)' : 
            result.category === 'moderate' ? 'var(--risk-moderate)' : 
            'var(--risk-low)';

        // Update Badge
        riskBadge.textContent = result.category === 'high' ? 'High Risk' : result.category === 'moderate' ? 'Moderate Risk' : 'Low Risk';
        riskBadge.className = `badge-risk ${result.category}`;

        // Update Summary
        if (result.category === 'high') {
            clinicalSummary.textContent = "Patient exhibits highly significant clinical indicators associated with >50% diameter coronary artery stenosis.";
        } else if (result.category === 'moderate') {
            clinicalSummary.textContent = "Patient shows some risk factors. Further non-invasive investigation may be warranted.";
        } else {
            clinicalSummary.textContent = "Patient exhibits a low probability of significant coronary artery disease based on current parameters.";
        }

        // Render Factors
        factorsList.innerHTML = '';
        result.factors.forEach(f => {
            const li = document.createElement('li');
            li.className = f.type;
            const icon = f.type === 'critical' ? 'fa-triangle-exclamation' : f.type === 'warning' ? 'fa-circle-exclamation' : 'fa-check-circle';
            li.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${f.text}</span>`;
            factorsList.appendChild(li);
        });

        // Render Recommendations
        recsList.innerHTML = '';
        result.recs.forEach(r => {
            const li = document.createElement('li');
            li.innerHTML = `<i class="fa-solid fa-stethoscope"></i> <span>${r}</span>`;
            recsList.appendChild(li);
        });
        
        // Scroll to results on mobile
        if (window.innerWidth < 1024) {
            document.querySelector('.results-panel').scrollIntoView({ behavior: 'smooth' });
        }
    }
});
