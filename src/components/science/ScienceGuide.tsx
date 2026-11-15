import { useState } from 'react'
import { Activity, ArrowRight, ArrowUpRight, AudioLines, Check, Database, Eye, ScanLine, Waves } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { DatasetConfig } from '../../data/datasets'
import { soundPresets } from '../../audio/types'
import './ScienceGuide.css'

type ScienceGuideProps = { dataset: DatasetConfig }

const pipeline = [
  { title: 'NASA video frame', icon: <Waves aria-hidden="true" />, text: 'The packaged SVS #3912 video supplies the rendered frame at the shared playback time.', detail: 'The NASA source visualizes ECCO2-modeled surface-current flow and colors it by corresponding sea-surface temperature. EarthSonic reads this rendered image, not the underlying model arrays.' },
  { title: 'Canvas sampling', icon: <ScanLine aria-hidden="true" />, text: 'A browser canvas draws each accepted frame at 96 × 48 pixels.', detail: 'Canvas reads the displayed RGB pixels. Rendering, interpolation, scaling and video compression can influence those values.' },
  { title: 'Frame analysis', icon: <Eye aria-hidden="true" />, text: 'The analyzer calculates image brightness, channel balance, spatial detail and change.', detail: 'The metrics describe visual properties of this sampled frame. The service does not return calibrated local ocean temperatures or current velocities.' },
  { title: 'Sound mapping', icon: <Activity aria-hidden="true" />, text: 'Four selected image features become synthesis controls.', detail: 'Brightness controls amplitude, red–blue balance controls pitch, left–right brightness balance controls pan, and time-normalized image change controls modulation rate.' },
  { title: 'Web Audio engine', icon: <AudioLines aria-hidden="true" />, text: 'One browser audio engine updates its oscillator, filter, gain and stereo panner.', detail: 'Sound profiles change synthesis character. They do not change the NASA video or assign scientific meaning to the sound.' },
  { title: 'Sound', icon: <AudioLines aria-hidden="true" />, text: 'The result is an artistic auditory interpretation of the rendered visualization.', detail: 'The sound is generated in the browser. It is not a recording of the ocean, and it does not directly sonify raw ECCO2 fields.' },
]

const profiles = [
  { id: 'calm-ocean', filter: '920 Hz', overtone: '0.055', depth: '0.055', display: '0.88' },
  { id: 'deep-ocean', filter: '680 Hz', overtone: '0.095', depth: '0.085', display: '0.84' },
  { id: 'dynamic-currents', filter: '2,850 Hz', overtone: '0.17', depth: '0.19', display: '0.72' },
  { id: 'experimental', filter: '5,200 Hz', overtone: '0.22', depth: '0.27', display: '0.62' },
]

export function ScienceGuide({ dataset }: ScienceGuideProps) {
  const [activeStep, setActiveStep] = useState(0)
  const step = pipeline[activeStep]

  return <section className="science-guide" id="science-guide" aria-labelledby="science-guide-heading">
    <header className="science-guide-header">
      <span className="explore-section-index">06 <i /> SCIENCE GUIDE</span>
      <div className="science-guide-heading-copy">
        <h2 id="science-guide-heading">What the image can tell us.<br /><em>And what it cannot.</em></h2>
        <p>Follow one rendered NASA frame from the source video to EarthSonic’s generated sound—with the limits visible at every step.</p>
      </div>
    </header>

    <section className="science-guide-source" aria-labelledby="science-guide-source-heading">
      <figure className="science-guide-source-figure">
        <img src={dataset.previewImage} alt="NASA SVS #3912 rendered global sea surface-current visualization, colored by sea-surface temperature." loading="lazy" />
        <figcaption>NASA SVS #3912 · RENDERED MODEL VISUALIZATION</figcaption>
      </figure>
      <div className="science-guide-source-copy">
        <span className="science-guide-overline"><Database size={14} aria-hidden="true" /> THE SCIENTIFIC SOURCE</span>
        <h3 id="science-guide-source-heading">{dataset.title}</h3>
        <p>Sea-surface currents are large-scale flows in the ocean’s upper layer. Sea-surface temperature describes how warm or cool that surface water is. In this NASA visualization, animated flow lines show modeled surface currents; color represents their corresponding sea-surface temperature.</p>
        <p>ECCO2 is a joint MIT/JPL ocean and sea-ice modeling project. NASA describes it as using the MIT general circulation model to synthesize satellite and in-situ observations with a global model. SVS #3912 visualizes model output; it is not a live measurement or a recording of ocean sound.</p>
        <dl className="science-guide-source-facts"><div><dt>PERIOD</dt><dd>{dataset.temporalCoverage.label}</dd></div><div><dt>MODEL</dt><dd>ECCO2 · MIT/JPL</dd></div><div><dt>COLOR KEY</dt><dd>NASA sea-surface-temperature legend</dd></div></dl>
        <div className="science-guide-source-links"><a href={dataset.sourceUrl} target="_blank" rel="noreferrer">NASA SVS #3912 source record <ArrowUpRight size={15} aria-hidden="true" /></a><a href={dataset.colorLegend.image} target="_blank" rel="noreferrer">View the packaged NASA color legend <ArrowUpRight size={15} aria-hidden="true" /></a></div>
      </div>
    </section>

    <section className="science-guide-analysis" aria-labelledby="science-guide-analysis-heading">
      <header><span className="science-guide-overline">HOW WE READ THE IMAGE</span><h3 id="science-guide-analysis-heading">Rendered pixels, described plainly.</h3><p>The frame analyzer samples the video through Canvas at 96 × 48 pixels. These are image features—not direct ECCO2 numerical measurements.</p></header>
      <div className="science-guide-metric-table-wrap">
        <table className="science-guide-metric-table">
          <caption>Image-analysis features and their role in EarthSonic</caption>
          <thead><tr><th scope="col">Feature</th><th scope="col">What the code calculates</th><th scope="col">Sound relationship</th></tr></thead>
          <tbody>
            <tr><th scope="row">Image brightness</th><td>Mean pixel luminance using weighted red, green and blue channels, normalized 0–1.</td><td>Maps to synthesis amplitude (0.30–0.85 before other sound controls). Brighter frames raise the mapped level.</td></tr>
            <tr><th scope="row">Average RGB &amp; color bins</th><td>Mean rendered red, green and blue channel values (0–255), plus the three most common of 64 coarse RGB bins.</td><td>RGB summary and dominant bins are descriptive. The red/blue channel difference below is mapped to pitch.</td></tr>
            <tr><th scope="row">Red–blue balance</th><td>Normalized difference between mean red and mean blue channels: (mean R − mean B + 1) ÷ 2.</td><td>Maps to artistic pitch. The default range is 170–520 Hz; Studio can adjust the pitch span. It is not calibrated temperature.</td></tr>
            <tr><th scope="row">Left–right brightness balance</th><td>Compares mean luminance in the left and right halves, then normalizes the contrast.</td><td>Maps to stereo pan (default −0.75 to +0.75). It is a screen-space feature, not geographic position.</td></tr>
            <tr><th scope="row">Smoothed image-change rate</th><td>Mean normalized RGB difference between samples ÷ elapsed video time, then exponentially smoothed with a 0.5-second time constant. Seeking resets the baseline.</td><td>Maps to modulation rate (0.5–5 Hz using an artistic 0.5-per-video-second reference). It is not current speed.</td></tr>
            <tr><th scope="row">Spatial pixel variation</th><td>Scaled and clamped mean luminance differences between adjacent horizontal and vertical pixels.</td><td>Informational only; it does not currently affect sound.</td></tr>
          </tbody>
        </table>
      </div>
      <details className="science-guide-secondary-metrics"><summary>Other calculated diagnostics</summary><p>The analyzer also reports screen-space brightness in four quadrants and a legacy frame-change index (mean absolute RGB difference × 2, clamped 0–1). These are not used by the sound mapping. The legacy index depends on sample spacing; the sound uses the separate time-normalized, smoothed image-change rate.</p></details>
    </section>

    <section className="science-guide-pipeline" aria-labelledby="science-guide-pipeline-heading">
      <header><span className="science-guide-overline">HOW PIXELS BECOME SOUND</span><h3 id="science-guide-pipeline-heading">One frame. Six steps.</h3><p>Select a stage to see what EarthSonic actually does there.</p></header>
      <div className="science-guide-pipeline-steps" role="group" aria-label="Interactive image-to-sound pipeline steps">{pipeline.map((item, index) => <button key={item.title} type="button" className={activeStep === index ? 'is-active' : ''} aria-pressed={activeStep === index} onClick={() => setActiveStep(index)}><span className="pipeline-step-number">0{index + 1}</span><span className="pipeline-step-icon">{item.icon}</span><span>{item.title}</span></button>)}</div>
      <div className="science-guide-pipeline-detail" aria-live="polite" aria-atomic="true"><span>0{activeStep + 1} / 06 · {step.title.toUpperCase()}</span><p>{step.detail}</p></div>
      <ol className="science-guide-mapping-list" aria-label="Image features mapped to sound"><li><span>Image brightness</span><b>Amplitude · 0.30–0.85</b></li><li><span>Red–blue visual balance</span><b>Pitch · default 170–520 Hz</b></li><li><span>Left–right image balance</span><b>Stereo pan · default −0.75 to +0.75</b></li><li><span>Smoothed image-change rate</span><b>Modulation rate · 0.5–5 Hz</b></li></ol>
    </section>

    <section className="science-guide-profiles" aria-labelledby="science-guide-profiles-heading">
      <header><span className="science-guide-overline">EXPLORE THE SOUND PROFILES</span><h3 id="science-guide-profiles-heading">Four sound designs. One visual mapping.</h3><p>Each profile uses the same pixel-to-control relationships. It changes the character of the synthesized sound—not a claim about ocean conditions.</p></header>
      <div className="science-guide-profile-table-wrap"><table className="science-guide-profile-table"><caption>Actual profile settings in the Web Audio engine</caption><thead><tr><th scope="col">Profile</th><th scope="col">Low-pass cutoff</th><th scope="col">Overtone gain</th><th scope="col">Modulation depth</th><th scope="col">Analyser smoothing</th></tr></thead><tbody>{soundPresets.map((profile) => { const values = profiles.find((item) => item.id === profile.id)!; return <tr key={profile.id}><th scope="row">{profile.name}</th><td>{values.filter}</td><td>{values.overtone}</td><td>{values.depth}</td><td>{values.display}</td></tr> })}</tbody></table></div>
      <p className="science-guide-profile-note">The engine uses a sine tone, triangle overtone and square-wave modulator. Profiles smoothly adjust filter cutoff, overtone gain, mix gain and modulation depth. Analyser smoothing affects the displayed spectrum response. Master volume and frame-to-sound mapping remain separate controls.</p>
    </section>

    <section className="science-guide-limits" aria-labelledby="science-guide-limits-heading">
      <header><span className="science-guide-overline">SCIENTIFIC ACCURACY</span><h3 id="science-guide-limits-heading">A clear boundary between data and interpretation.</h3></header>
      <div className="science-guide-limits-columns">
        <div><h4><Check size={16} aria-hidden="true" /> What EarthSonic does</h4><ul><li>Uses the NASA SVS #3912 ocean visualization.</li><li>Samples rendered video frames and calculates pixel characteristics.</li><li>Maps selected visual features to browser audio synthesis parameters.</li><li>Produces an artistic auditory interpretation of that visualization.</li></ul></div>
        <div><h4><span aria-hidden="true">—</span> What it does not claim</h4><ul><li>Direct sonification of raw ECCO2 numerical fields.</li><li>Recorded underwater or ocean sounds.</li><li>Real-time local sea temperature or actual current velocity from pixels.</li><li>Geographically precise or region-specific sound for Explore selections.</li></ul></div>
      </div>
      <p className="science-guide-limit-note">Compression, rendering, interpolation, resampling and sample timing affect the analyzed pixels. The sound is an artistic interpretation of the rendered NASA visualization.</p>
    </section>

    <section className="science-guide-try" aria-labelledby="science-guide-try-heading">
      <div><span className="science-guide-overline">CONTINUE EXPLORING</span><h3 id="science-guide-try-heading">See it. Hear it. Follow the method.</h3><p>Open the real Studio controls or return to the NASA visualization and region entry points.</p></div>
      <div><Link className="button button-primary" to="/studio">Open Studio <ArrowRight size={16} aria-hidden="true" /></Link><Link className="science-guide-explore-link" to="/explore#nasa-visualization">Explore the NASA visualization <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
    </section>
  </section>
}
