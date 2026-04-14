const fileInput = document.getElementById('fileInput')
const info = document.getElementById('info')

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0]
    console.log(file)
})

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
    console.log('First 5 samples:', mono.slice(0, 5))
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