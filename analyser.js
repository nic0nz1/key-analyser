const fileInput = document.getElementById('fileInput')
const info = document.getElementById('info')

let audioContext = null

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!audioContext) {
        audioContext = new AudioContext()
    }

    const arrayBuffer = await file.arrayBuffer()
    console.log('raw bytes loaded:', arrayBuffer.byteLength, "bytes")

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    console.log('Sample rate:', audioBuffer.sampleRate)
    console.log('Duration:', audioBuffer.duration, 'seconds')
    console.log('Number of channels:', audioBuffer.numberOfChannels)
    console.log('Total samples per channel:', audioBuffer.length)

    const mono = mixToMono(audioBuffer)
    console.log('Mono samples:', mono.length)

    const FRAME_SIZE = 4096
    const HOP_SIZE = 2048

    const totalChroma = new Float32Array(12)

    for (let start = 0; start + FRAME_SIZE < mono.length; start += HOP_SIZE) {
        const frame = mono.slice(start, start + FRAME_SIZE)
        const magnitudes = computeFrameMagnitudes(frame, FRAME_SIZE)
        const chroma = buildChroma(magnitudes, audioContext.sampleRate, FRAME_SIZE) 

        // Add this frame's chroma to the running total
        for (let i = 0; i < 12; i++) {
            totalChroma[i] += chroma[i]
        }
    }
    console.log('Total chroma:', totalChroma)
    const chromaSum = totalChroma.reduce((sum, v) => sum + v, 0)
    const normalisedChroma = totalChroma.map(v => v / chromaSum)

    const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
    const normalisedArray = Array.from(normalisedChroma)
    const sorted = normalisedArray.map((v, i) => ({ note: noteNames[i], value: v })).sort((a, b) => b.value - a.value)

    sorted.forEach(n => console.log(n.note, n.value.toFixed(4)))

    console.log('Normalised chroma:')
    //const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

    normalisedChroma.forEach((v, i) => {
        console.log(`${noteNames[i]}: ${v.toFixed(4)}`)
    })


    const key = detectKey(Array.from(normalisedChroma))
    console.log('Detected key:', key)
})

function mixToMono(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels
    const length = audioBuffer.length

    const mono = new Float32Array(length)

    for (let channel = 0; channel < numChannels; channel++) {
        const data = audioBuffer.getChannelData(channel)
        for (let i = 0; i < length; i++) {
            mono[i] += data[i]
        }
    }

    // Normalize the mono output
    for (let i = 0; i < length; i++) {
        mono[i] /= numChannels
    }

    return mono
}

function computeFrameMagnitudes(samples, frameSize) {
    const re = Array.from(samples)

    const im = new Array(frameSize).fill(0)

    fft(re, im)

    const magnitudes = new Float32Array(frameSize / 2)

    for (let i = 0; i < frameSize / 2; i++) {
        magnitudes[i] = Math.hypot(re[i], im[i])
    }


    return magnitudes
}

function buildChroma(magnitudes, sampleRate, frameSize) {
    // 12 bins for the 12 semitones in an octave
    const chroma = new Float32Array(12)

    for (let i = 1; i < magnitudes.length; i++) {
        // calculate the actual frequency of this bin
        const frequency = i * sampleRate / frameSize

        // convert freq to midi note number
        const midi = 12 * (Math.log2(frequency / 440)) + 69

        // get pitch class (0-11)
        const pitchClass = ((Math.round(midi) % 12) + 12) % 12

        //add this bins magnitude to the appropriate chroma bin
        //only consider if mag is above the noise floor (-80 db)
        if (magnitudes[i] > 0.0001) {
            chroma[pitchClass] += magnitudes[i]
        }
    }
    return chroma
}

function detectKey(chroma) {
    const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

    // krumhansl major profile
    const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]

    // krumhansl minor profile
    const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

    let bestScore = -Infinity
    let bestKey = ''

    for (let root = 0; root < 12; root++) {
        const majorRotated = rotateArray(majorProfile, 12-root)
        const minorRotated = rotateArray(minorProfile, 12-root)

        const majorScore = pearsonCorrelation(chroma, majorRotated)
        const minorScore = pearsonCorrelation(chroma, minorRotated)
        
        console.log(noteNames[root] + ' major: ' + majorScore.toFixed(4))
        console.log(noteNames[root] + ' minor: ' + minorScore.toFixed(4))

        if (majorScore > bestScore) {
            bestScore = majorScore
            bestKey = noteNames[root] + ' major'
        }
        if (minorScore > bestScore) {
            bestScore = minorScore
            bestKey = noteNames[root] + ' minor'
        }
    }
    return bestKey
}

function rotateArray(arr, n) {
    return arr.slice(n).concat(arr.slice(0, n))
}

function pearsonCorrelation(x, y) {
    let sumX = 0
    let sumY = 0
    for (let i = 0; i < 12; i++) {
        sumX += x[i]
        sumY += y[i]
    }

    const meanX = sumX / 12
    const meanY = sumY / 12

    let num = 0
    let dx = 0
    let dy = 0

    for (let i = 0; i < 12; i++) {
        num += (x[i] - meanX) * (y[i] - meanY)
        dx += (x[i] - meanX) ** 2
        dy += (y[i] - meanY) ** 2
    }

    const denom = Math.sqrt(dx * dy)
    return denom === 0 ? 0 : num / denom
}