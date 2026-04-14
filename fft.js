function fft(re, im) {
    const n = re.length

    // Bit-reversal permutation
    let j = 0
    for (let i  = 1; i < n; i++) {
        let bit = n >> 1
        for (; j >= bit; bit >>= 1) {
            j^= bit
        }
        j ^= bit
        if (j < i) {
            ;[re[i], re[j]] = [re[j], re[i]]
            ;[im[i], im[j]] = [im[j], im[i]]
        }
    }

    // butterfly operations
    for (len = 2; len <= n; len <<= 1) {
        const angle = -2 * Math.PI / len
        const wRe = Math.cos(angle)
        const wIm = Math.sin(angle)

        for (let i = 0; i < n; i += len) {
            let curRe = 1
            let curIm = 0

            for (let k = 0; k < len / 2; k++) {
                //u = top half of the butterfly
                const uRe = re[i + k]
                const uIm = im[i + k]

                //v = bottom half of the butterfly
                const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm
                const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe

                //combine u and v
                re[i + k] = uRe + vRe
                im[i + k] = uIm + vIm
                re[i + k + len / 2] = uRe - vRe
                im[i + k + len / 2] = uIm - vIm

                //advace the rotation
                const nextRe = curRe * wRe - curIm * wIm
                curIm = curRe * wIm + curIm * wRe
                curRe = nextRe
            }
        }
    }
}