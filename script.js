// Link em formato CSV exportado do Google Sheets
const URL_GOOGLESHEETS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRad8bx8f6dSZByCnN3u8eCk6QoKaS-7ySKGjERPFUFd7TC-IZIgQG__cvkHWOQCRpr2H3_nM9yTpKE/pubhtml?gid=1921425952&single=true/export?format=csv';

window.onload = function() {
    // Carrega automaticamente os dados ao abrir a página
    carregarDadosSheets(URL_GOOGLESHEETS);
};

function carregarDadosSheets(url) {
    Papa.parse(url, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.data && results.data.length > 0) {
                processarDados(results.data);
            } else {
                alert('Nenhum dado encontrado na planilha.');
            }
        },
        error: function(err) {
            console.error('Erro ao conectar ao Google Sheets:', err);
        }
    });
}

function processarDados(data) {
    let tempos = [];
    let acelX = [];
    let acelY = [];
    let acelZ = [];
    let maxZ = 0;
    let ultimoStatus = "Normal";

    data.forEach(row => {
        let t = parseFloat(row['Tempo (s)']) || 0;
        let x = parseFloat(row['Aceleração X (g)']) || parseFloat(row['Aceleração X']) || 0;
        let y = parseFloat(row['Aceleração Y (g)']) || parseFloat(row['Aceleração Y']) || 0;
        let z = parseFloat(row['Aceleração Z (g)']) || parseFloat(row['Aceleração Z']) || 0;

        tempos.push(t);
        acelX.push(x);
        acelY.push(y);
        acelZ.push(z);

        if (z > maxZ) maxZ = z;

        if (row['Status Estrutural']) {
            ultimoStatus = row['Status Estrutural'];
        } else if (row['Status']) {
            ultimoStatus = row['Status'];
        }
    });

    // Atualização dos indicadores KPI
    const kpiStatusEl = document.getElementById('kpiStatus');
    if (kpiStatusEl) {
        kpiStatusEl.innerText = ultimoStatus;
        
        const cardStatus = kpiStatusEl.closest('.kpi-card');
        if (cardStatus) {
            if (ultimoStatus.toLowerCase().includes('crítico') || ultimoStatus.toLowerCase().includes('critico')) {
                cardStatus.style.borderTopColor = '#EF4444';
            } else if (ultimoStatus.toLowerCase().includes('atenção') || ultimoStatus.toLowerCase().includes('atencao')) {
                cardStatus.style.borderTopColor = '#F59E0B';
            } else {
                cardStatus.style.borderTopColor = '#10B981';
            }
        }
    }

    const kpiMaxZEl = document.getElementById('kpiMaxZ');
    if (kpiMaxZEl) kpiMaxZEl.innerText = maxZ.toFixed(4);

    const kpiLeiturasEl = document.getElementById('kpiLeituras');
    if (kpiLeiturasEl) kpiLeiturasEl.innerText = data.length;

    renderizarGraficoAceleracao(tempos, acelX, acelY, acelZ);
    renderizarGraficoFFT(acelX, tempos);
}

let chartAcelInstance = null;
let chartFFTInstance = null;

function renderizarGraficoAceleracao(tempos, x, y, z) {
    const canvas = document.getElementById('chartAceleracao');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartAcelInstance) chartAcelInstance.destroy();

    chartAcelInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: tempos,
            datasets: [
                { label: 'Eixo X', data: x, borderColor: '#EF4444', backgroundColor: '#EF4444', borderWidth: 2, fill: false },
                { label: 'Eixo Y', data: y, borderColor: '#10B981', backgroundColor: '#10B981', borderWidth: 2, fill: false },
                { label: 'Eixo Z', data: z, borderColor: '#3B82F6', backgroundColor: '#3B82F6', borderWidth: 2, fill: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: '1. Tendência Temporal de Aceleração (X, Y, Z)', color: '#F8FAFC' },
                legend: { labels: { color: '#CBD5E1' } }
            },
            scales: {
                x: { ticks: { color: '#CBD5E1' }, grid: { color: '#334155' } },
                y: { ticks: { color: '#CBD5E1' }, grid: { color: '#334155' } }
            }
        }
    });
}

function renderizarGraficoFFT(sinalX, tempos) {
    const canvas = document.getElementById('chartFFT');
    if (!canvas) return;
    const N = sinalX.length;
    if (N < 2) return;

    let dt = (tempos[N - 1] - tempos[0]) / (N - 1);
    if (!dt || dt <= 0) dt = 0.01;
    const Fs = 1 / dt;

    let freqs = [];
    let magnitudes = [];

    const numBins = Math.floor(N / 2);
    for (let k = 0; k < numBins; k++) {
        let real = 0;
        let imag = 0;
        let freq = (k * Fs) / N;

        for (let n = 0; n < N; n++) {
            let angle = (2 * Math.PI * k * n) / N;
            real += sinalX[n] * Math.cos(angle);
            imag -= sinalX[n] * Math.sin(angle);
        }

        let mag = (Math.sqrt(real * real + imag * imag) / N) * 2;
        freqs.push(freq.toFixed(2));
        magnitudes.push(mag.toFixed(4));
    }

    const ctx = canvas.getContext('2d');
    if (chartFFTInstance) chartFFTInstance.destroy();

    chartFFTInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: freqs,
            datasets: [{
                label: 'Magnitude (g)',
                data: magnitudes,
                backgroundColor: '#8B5CF6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: '2. Espectro de Frequência - Eixo X (FFT)', color: '#F8FAFC' },
                legend: { display: false }
            },
            scales: {
                x: { ticks: { color: '#CBD5E1' }, grid: { color: '#334155' } },
                y: { ticks: { color: '#CBD5E1' }, grid: { color: '#334155' } }
            }
        }
    });
}
