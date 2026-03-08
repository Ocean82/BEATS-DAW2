Based on the massive 55-page document provided, here is a highly distilled summary focused strictly on your specific constraints: **ONNX models, CPU-friendly models, and 4+ stem separation.** 

While the document heavily discusses "Roformers" (BS-Roformer/Mel-Roformer) as the current state-of-the-art, **Roformers are terrible for CPUs** (they require heavy Nvidia GPUs and use `.ckpt`/`.pth` weights). 

Therefore, for **ONNX and CPU usage**, your focus must be on the **MDX-Net** and **Demucs** architectures.

Here is your comprehensive guide based on the document's consensus.

---

### 1. Which Are the Best? (ONNX & CPU Friendly)

**For 4 or More Stems (Vocals, Bass, Drums, Other):**
*   **Demucs 4 (`htdemucs_ft`)**: This is the absolute best CPU-friendly model for 4 stems. It handles the bass and drums exceptionally well. There is also a **Demucs 6-stem (`htdemucs_6s`)** version that attempts to separate piano and guitar, though it is highly experimental and prone to bleed.
*   **KUIELab-MDXNET23C (4 Stems)**: An ONNX-based 4-stem model. It is faster than Demucs but usually slightly less accurate in overall isolation (lower SDR metric), though some users prefer its drum separation.

**For 2 Stems (Vocals / Instrumental):**
*   **MDX-Net HQ_4 & HQ_5 (.onnx)**: The best all-around ONNX models for fast, CPU-friendly separation. HQ_4 is slightly cleaner for instrumentals, while HQ_5 is faster but can be a bit muddier.
*   **MDX23C-InstVoc HQ (.onnx)**: The absolute best ONNX model for vocal/instrumental separation. It is full-band (no frequency cutoff) and leaves very little vocal bleed, though it takes longer to process on a CPU than the HQ_4 model.

### 2. Architecture Breakdown

*   **MDX-Net (v2 & v3/23C):** Uses the **ONNX** format natively. It relies on spectrogram analysis. It is highly optimized, making it the fastest architecture to run on a CPU. It is primarily used for 2-stem (Vocal/Inst) separation. 
*   **Demucs (v3 & v4):** Uses `.th` (Torch) weights. It is a hybrid architecture that analyzes both waveforms and spectrograms. While heavier than MDX, it is fully capable of running on a CPU without crashing (unlike Roformers), it just takes longer. It is the gold standard for 4+ stem separation.

### 3. Set Up & Usage

To run these models, you need **UVR5 (Ultimate Vocal Remover)**, which is the standard GUI for audio separation.

**Installation & Setup:**
1.  Download and install **UVR5** (v5.6.0 or the latest Beta patch).
2.  Open the app and click the **Wrench Icon** (Settings) -> **Download Center**.
3.  Here, you can easily download the weights for MDX-Net (ONNX) and Demucs models directly into the app.
4.  **CPU Configuration:** On the main UVR screen, ensure **"GPU Conversion" is UNCHECKED**. This forces the app to use your CPU.

### 4. File Management & Weights

If you download custom `.onnx` models from GitHub or community links (like the VIP models mentioned in the doc), here is how to use them:

*   **ONNX Models (`.onnx`):** Place the weight files in `Ultimate Vocal Remover\models\MDX_Net_Models`.
*   **ONNX Configs (`.yaml` or `.json`):** Place the associated configuration files in `Ultimate Vocal Remover\models\MDX_Net_Models\model_data\mdx_c_configs`.
*   **Demucs Models (`.th`):** Place these in `Ultimate Vocal Remover\models\Demucs_Models`.

### 5. Optimal CPU Settings (Usage Tips)

Running AI on a CPU can take a long time and consume a lot of RAM. Use these settings in UVR5 to prevent your computer from freezing:

**For MDX-Net (ONNX):**
*   **Segment Size:** Lower this to **256** (or **512** if you have 16GB+ of RAM). Higher segment sizes increase quality slightly but will max out your CPU and RAM.
*   **Overlap:** Keep this around **0.5 to 0.75**. Going higher (like 0.99) yields diminishing returns and exponentially increases processing time.
*   **Volume Compensation:** Set to "Auto."

**For Demucs (4+ Stems):**
*   **Shifts:** Set to **0 or 2**. (Setting this to 10 or 20 gives the best quality but will take *hours* on a CPU).
*   **Overlap:** Set to **0.25** (default) or **0.75** maximum.

### 6. Best Uses & Workflow

Based on the document's expert advice, if you want the best possible 4-stem result using only a CPU:

1.  **Extract the Vocals First (ONNX):** Run your track through **MDX23C-InstVoc HQ** or **MDX-Net HQ_4**. Save the Instrumental and the Vocal.
2.  **Split the Rest (Demucs):** Take the *Instrumental* you just generated and run it through **Demucs 4 (`htdemucs_ft`)**. 
3.  *Why?* Demucs sometimes struggles to cleanly remove vocals from drums and bass. By using an ONNX model to strip the vocals first, you feed Demucs a clean instrumental, resulting in near-perfect Bass, Drums, and Melody stems.