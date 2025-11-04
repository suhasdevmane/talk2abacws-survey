// src/pages/Ideas.js
import React, { useState, useEffect, useMemo } from 'react';
import TopNav from '../components/TopNav';
import '../components/Home.css';

const CATEGORIES = [
  {
    id: 'energy',
    title: 'Energy Efficiency',
    description: 'Reduce energy demand and improve operational performance through monitoring, optimization, and efficient systems.',
    benefits: ['Lower operating costs', 'Reduced carbon emissions', 'Improved asset rating (EPC/BREEAM/LEED)'],
    ideas: [
      "What is today's total electricity consumption by floor?",
      'Which spaces show abnormal energy spikes this week?',
      'Show me baseload consumption during off-hours.',
      'Which HVAC zones run while unoccupied?',
      'Compare energy use intensity (kWh/m²) across floors.',
      "What's the peak demand trend vs last month?",
      'Which devices have the highest standby loads?',
      'Which hours have the highest peak demand charges?',
      'Show energy by end-use (HVAC, lighting, plug loads).',
      'Which AHUs could reduce fan speed without comfort loss?',
      'Identify simultaneous heating and cooling events.',
      'Which areas benefit most from schedule optimization?',
      'Compare weekday vs weekend consumption patterns.',
      'Which meters show data gaps or sensor drift?',
      'Estimate savings from turning off non-critical loads.',
      'Where is the largest increase in kWh vs last quarter?',
      'Show demand response potential for tomorrow\'s peak.',
      'Which zones exceed target kWh/m² benchmarks?',
      'How did energy intensity change after recent retrofits?',
      'Which devices should be prioritized for replacement?'
    ],
  },
  {
    id: 'thermal',
    title: 'Health & Wellbeing — Thermal Comfort',
    description: 'Maintain comfortable temperatures and stable conditions that align with comfort models (PMV/PPD).',
    benefits: ['Higher occupant satisfaction', 'Better productivity', 'Fewer complaints'],
    ideas: [
      'Which rooms exceed thermal comfort thresholds today?',
      'Show me spaces with high temperature variability this week.',
      'Which HVAC zones need rebalancing due to persistent hot/cold spots?',
      'What is the PMV/PPD trend per floor (if available)?',
      'List rooms with frequent manual overrides of setpoints.',
      'Which rooms are frequently below minimum temperature setpoints?',
      'Identify spaces with unstable temperature ramps in the morning.',
      'Which sensors show drift compared to reference devices?',
      'Where do occupants submit the most comfort complaints?',
      'Show correlation between occupancy and thermal alarms.',
      'Which zones need finer control (e.g., smaller VAV turndown)?',
      'Highlight rooms with excessive reheating energy.',
      'Which spaces have chronic discomfort after 3pm?',
      'Show hours out of comfort band (ASHRAE-55 style) per zone.',
      'Which AHUs have unstable supply air temperatures?',
      'Which zones experience overshoot/undershoot frequently?',
      'List rooms where setpoint changes are most common.',
      'Which areas would benefit from improved zoning?',
      'Which zones have highest HVAC reheat hours per m²?',
      'Identify rooms where occupancy regularly conflicts with setpoints.',
    ],
  },
  {
    id: 'lighting',
    title: 'Health & Wellbeing — Lighting / Visual Comfort',
    description: 'Provide adequate illumination and minimize glare to support comfort and circadian health.',
    benefits: ['Reduced eye strain', 'Better visual comfort', 'Improved wellbeing'],
    ideas: [
      'Which areas frequently report glare or over-illumination?',
      'Show me average lux levels by zone during working hours.',
      'Where are daylight sensors underperforming (low response)?',
      'List spaces where lights remain on after hours.',
      'Which rooms have the most lighting overrides?',
      'Which zones fall below recommended lux targets?',
      'Highlight areas with excessive contrast ratios.',
      'Where are occupancy sensors missing detections?',
      'List circuits with high standby power when off.',
      'Where can task lighting reduce ambient energy?',
      'Show trends for daylight harvesting effectiveness.',
      'Which meeting rooms leave lights on when unoccupied?',
      'Identify flicker-prone fixtures or failing drivers.',
      'Which zones need better glare control near windows?',
      'Suggest lighting schedule changes for late evenings.',
      'Show correlation of light levels with complaints.',
      'Which spaces need tunable white for circadian support?',
      'Which zones would benefit from daylight blinds automation?',
      'Show occupancy vs light-on time efficiency.',
      'Identify areas needing emergency lighting testing.'
    ],
  },
  {
    id: 'iaq',
    title: 'Health & Wellbeing — Indoor Air Quality',
    description: 'Monitor CO₂, VOCs, PM, and humidity to maintain healthy indoor environments.',
    benefits: ['Fewer complaints and headaches', 'Better cognitive performance', 'Compliance with IAQ standards'],
    ideas: [
      'Which rooms exceeded CO₂ thresholds today?',
      'Show areas with persistently high VOC levels.',
      'List spaces where RH is outside 40–60% comfort range.',
      'Where are PM2.5/PM10 sensors indicating poor air quality?',
      'Which AHUs under-ventilated during high occupancy?',
      'Identify zones with sustained CO₂ creep in afternoons.',
      'Which filters show rising pressure drop trends?',
      'Where is outside air fraction below target ranges?',
      'List rooms with humidification/dehumidification issues.',
      'Show correlation between IAQ and occupancy counts.',
      'Which sensors require calibration based on drift?',
      'Where do VOC spikes correlate with cleaning schedules?',
      'Which spaces need increased purge cycles?',
      'Show IAQ index score by zone (aggregated metric).',
      'List areas with repeated IAQ alarms this month.',
      'Where are return air CO₂ sensors most unstable?',
      'Which zones need demand-controlled ventilation tuning?',
      'Which zones see RH excursions after cleaning cycles?',
      'Show CO₂ recovery time after meeting end.',
      'Identify spaces needing increased filtration grade.'
    ],
  },
  {
    id: 'acoustics',
    title: 'Health & Wellbeing — Noise & Acoustics',
    description: 'Reduce disruptive noise and manage acoustic quality for focused work and wellbeing.',
    benefits: ['Improved concentration', 'Fewer distractions', 'Higher satisfaction'],
    ideas: [
      'Which zones exceed recommended noise levels most often?',
      'Show me peak dB events and their times this week.',
      'Which areas near mechanical rooms need acoustic treatment?',
      'Correlate noise spikes with occupancy and equipment schedules.',
      'List spaces with frequent noise complaints.',
      'Identify times when open offices are quietest/loudest.',
      'Which meeting rooms suffer from poor sound isolation?',
      'Where do ventilation speeds create audible noise issues?',
      'Show dBA trends vs target per floor.',
      'Which devices cause tonal noise signatures?',
      'List areas that need sound masking adjustments.',
      'Which zones have reverberation time above targets?',
      'Correlate noise peaks with lift operations.',
      'Which days have the most acoustic anomalies?',
      'Show noise vs complaint correlation heatmap.',
      'Which zones near façades suffer traffic noise peaks?',
      'Show noise baseline during night hours.',
      'Identify equipment start/stop noise signatures.',
      'Which areas need acoustic ceiling/wall treatments?',
      'Correlate noise with IAQ fans speeds.',
      'Map hotspots of transient noise events.'
    ],
  },
  {
    id: 'water',
    title: 'Water Efficiency',
    description: 'Reduce water consumption and detect leaks for responsible resource use.',
    benefits: ['Lower utility costs', 'Leak prevention', 'Better stewardship'],
    ideas: [
      'Which fixtures show anomalous water usage?',
      'Show daily water consumption and weekend baseload.',
      'List zones with potential leaks (continuous overnight flow).',
      'Which conservation measures deliver the biggest savings?',
      'Identify floors with rising water intensity (L/m²).',
      'Which meters show step changes indicating faults?',
      'Show hot vs cold water splits by area.',
      'Which restrooms have highest flow rates per visit?',
      'List irrigation versus indoor consumption trends.',
      'Identify likely stuck valves or running cisterns.',
      'Where did water use increase after maintenance?',
      'Which hours show unexplained continuous flow?',
      'Forecast water demand and spot anomalies.',
      'Which zones could use auto-shutoff retrofits?',
      'Which cooling towers show abnormal makeup water?',
      'Show domestic hot water recirculation loop losses.',
      'Identify fixtures exceeding flow rate standards.',
      'Which zones show seasonal water use patterns?',
      'Detect irrigation during rainfall periods.',
      'Which AHUs have humidifiers with high consumption?',
      'Estimate savings from low-flow retrofits.'
    ],
  },
  {
    id: 'materials',
    title: 'Materials & Waste (Circularity)',
    description: 'Encourage low-impact materials and effective recycling to reduce embodied carbon and waste.',
    benefits: ['Lower embodied emissions', 'Higher recycling rates', 'Alignment with circular economy'],
    ideas: [
      'Which areas have the lowest recycling capture rate?',
      'Show contamination trends in recycling streams.',
      'Estimate embodied carbon hotspots from recent fit-outs.',
      'Which projects used EPD-backed low-carbon materials?',
      'Identify waste streams with rising disposal costs.',
      'Where could reuse/refurbishment replace new purchases?',
      'Show monthly diversion rate vs target.',
      'Which suppliers offer take-back schemes?',
      'List items suitable for remanufacture or reuse.',
      'Where are bins repeatedly overfilled/underused?',
      'Which areas need better signage for sorting?',
      'Estimate embodied carbon avoided by reuse this year.',
      'Which materials drive most lifecycle impacts?',
      'Track recycling participation by floor/tenant.',
      'Which waste streams need right-sizing of bins?',
      'Show month-over-month waste diversion improvement.',
      'Identify vendors with recycled-content products.',
      'Highlight reuse exchanges between teams.',
      'Estimate landfill avoided by donation programs.',
      'Which projects missed circular procurement targets?',
      'Plan material passports for future deconstruction.'
    ],
  },
  {
    id: 'transport',
    title: 'Transport & Mobility',
    description: 'Support sustainable travel choices and reduce transport emissions.',
    benefits: ['Lower scope 3 travel emissions', 'Happier commuters', 'Better site access'],
    ideas: [
      'Show usage patterns of EV chargers and bike racks.',
      'Which days have peak demand for sustainable transport amenities?',
      'Where are EV chargers most frequently occupied?',
      'List trends in active travel vs car parking use.',
      'Identify opportunities for shuttle or micro-mobility.',
      'Which locations need more secure bike storage?',
      'Show correlation of weather with modal split.',
      'Which hours see the longest queue for chargers?',
      'Forecast charging demand for upcoming events.',
      'Which incentives increased sustainable commutes?',
      'Which bike racks are consistently full?',
      'Show car park utilization vs policy targets.',
      'Identify opportunities for carpool matching.',
      'Track e-scooter parking compliance near entrances.',
      'Map average commute distances by mode (anonymized).',
      'Which shifts need staggered start to reduce peak load?',
      'Show emissions avoided from active travel promotions.',
      'Where to add wayfinding for sustainable modes?',
      'Track onsite shower/locker usage trends.',
      "Which days are ideal for 'car-free days'?"
    ],
  },
  {
    id: 'resilience',
    title: 'Resilience & Climate Adaptation',
    description: 'Prepare for extreme weather and grid constraints through data-driven resilience.',
    benefits: ['Reduced downtime', 'Business continuity', 'Risk mitigation'],
    ideas: [
      'Simulate demand response opportunities during peak events.',
      'Which critical zones lack redundancy for cooling?',
      'Identify areas at risk during heatwaves (past trends).',
      'Which equipment is most vulnerable to overheating?',
      'Show backup power coverage for critical loads.',
      'List flood-risk assets by elevation or basement zones.',
      'Which sensors alert earliest for overheating trends?',
      'Identify single points of failure in HVAC systems.',
      'Show readiness for grid constraint events.',
      'Which zones benefit from pre-cooling strategies?',
      'Correlate outage risks with maintenance tickets.',
      'Identify chilled water loops with low delta-T under stress.',
      'Show AHU failover test results history.',
      'Which zones need shading during heat events?',
      'Map assets beyond safe temperature envelopes.',
      'Track generator test runtimes and fuel levels.',
      'Which IT rooms lack adequate cooling redundancy?',
      'Estimate battery storage needed for critical loads.',
      'Show black start readiness checklist items.',
      'Identify single-homed feeds to critical panels.'
    ],
  },
  {
    id: 'commissioning',
    title: 'Commissioning & Performance Verification',
    description: 'Ensure systems operate as designed with continuous commissioning insights.',
    benefits: ['Fewer faults', 'Persistent savings', 'Verified performance (BREEAM/LEED credits)'],
    ideas: [
      'Which zones show sensor drift or calibration issues?',
      'Find simultaneous heating and cooling events.',
      'List recurring BMS alarms by priority and zone.',
      'Which PID loops oscillate and need tuning?',
      'Show equipment short cycling statistics.',
      'Which trend logs have gaps or anomalies?',
      'Identify valves/dampers stuck open or closed.',
      'Where do sequences of operation deviate most?',
      'List assets with highest fault recurrence.',
      'Show commissioning issues resolved vs open.',
      'Which AHUs fail to meet supply temp setpoints?',
      'Identify metering mismatches across hierarchies.',
      'Which economizers fail to open under favorable conditions?',
      'Show start/stop optimization effectiveness (warm-up/cool-down).',
      'Identify deadband violations across zones.',
      'Which sensors lack trend logs to verify sequences?',
      'Map valve authority issues from stroke commands.',
      'Track M&V baselines vs actual post-ECM.',
      'Which KPIs fail LEED/BREEAM monitoring prerequisites?',
      'List zones with chronic occupancy misdetection.'
    ],
  },
];

export default function Ideas() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState('all');

  const allIdeas = useMemo(() => {
    if (selected === 'all') return CATEGORIES.flatMap(c => c.ideas.map(q => ({ q, cat: c.id })));
    const cat = CATEGORIES.find(c => c.id === selected);
    return (cat?.ideas || []).map(q => ({ q, cat: cat.id }));
  }, [selected]);

  const generateIdeas = (n = 10) => {
    setLoading(true);
    try {
      const pool = [...allIdeas];
      const out = [];
      while (pool.length && out.length < n) {
        const idx = Math.floor(Math.random() * pool.length);
        out.push(pool.splice(idx, 1)[0]);
      }
      setSuggestions(out.map(o => o.q));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateIdeas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div className="home-body" style={{ minHeight: '100vh' }}>
      {/* Wave layers */}
      <div className="wave"></div>
      <div className="wave"></div>
      <div className="wave"></div>
      
      {/* Navbar */}
      <TopNav />

      {/* Main content */}
  <div className="container mt-4" id="content" style={{ maxWidth: 1400 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
          {/* Left sidebar: sustainability category cards */}
          <aside style={{
            width: 360,
            minWidth: 280,
            maxWidth: 420,
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 6px 14px rgba(0,0,0,0.08)'
          }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8, color: '#111827' }}>Sustainability Categories</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
              Select a category to view tailored question ideas.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '80vh', overflowY: 'auto', paddingRight: 6 }}>
              {CATEGORIES.map(cat => {
                const active = selected === cat.id || (selected === 'all' && false);
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelected(cat.id)}
                    className="btn"
                    style={{
                      textAlign: 'left',
                      whiteSpace: 'normal',
                      background: active ? '#e6ffed' : '#ffffff',
                      border: active ? '2px solid #16a34a' : '1px solid #e5e7eb',
                      color: active ? '#065f46' : '#111827',
                      borderRadius: 10,
                      padding: '12px 12px',
                      boxShadow: active ? '0 0 0 rgba(0,0,0,0)' : '0 2px 6px rgba(0,0,0,0.06)'
                    }}
                    title={cat.title}
                  >
                    <div style={{ fontWeight: 700 }}>{cat.title}</div>
                    <div style={{ fontSize: 12, color: active ? '#065f46' : '#6b7280', marginTop: 4 }}>{cat.description}</div>
                    <div style={{ fontSize: 11, color: active ? '#065f46' : '#4b5563', marginTop: 6 }}>
                      <strong>Benefits:</strong> {cat.benefits.join(' • ')}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Right: Question Ideas panel */}
          <section style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 12,
            padding: 24,
            boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, color: '#111827', fontSize: '1.8rem' }}>💡 Question Ideas</h1>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  className="form-select"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  style={{ maxWidth: 280 }}
                >
                  <option value="all">All categories</option>
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
                <button className="btn btn-primary" onClick={() => generateIdeas()}>
                  🔄 Get New Ideas
                </button>
                <button className="btn btn-success" onClick={() => window.location.href = '/survey'}>
                  Go to Visualizer →
                </button>
              </div>
            </div>

            <p style={{ fontSize: 14, color: '#6b7280', marginTop: -4, marginBottom: 12 }}>
              Showing ideas {selected === 'all' ? 'from all categories' : `for “${(CATEGORIES.find(c=>c.id===selected)?.title)||''}”`}.
            </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p style={{ marginTop: '20px', color: '#666' }}>Loading suggestions...</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '30px' }}>
                {suggestions.map((suggestion, index) => (
                  <div 
                    key={index}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      padding: '20px 25px',
                      borderRadius: '10px',
                      marginBottom: '15px',
                      fontSize: '1.1rem',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s',
                      cursor: 'default'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <strong style={{ marginRight: '10px' }}>{index + 1}.</strong>
                    {suggestion}
                  </div>
                ))}
              </div>

              {/* Suggestions list will appear below */}

              <div style={{ marginTop: '24px', padding: '16px', background: '#f8f9fa', borderRadius: '10px', borderLeft: '4px solid #667eea' }}>
                <h5 style={{ color: '#333', marginBottom: '15px' }}>💬 How to Use:</h5>
                <ul style={{ color: '#666', lineHeight: '1.8' }}>
                  <li>Click "Go to Visualizer" to explore the 3D building</li>
                  <li>Use the floating chatbot to ask any of these questions</li>
                  <li>The system will save your questions to help us improve</li>
                  <li>You can ask similar questions or create your own variations</li>
                </ul>
              </div>
            </>
          )}
        </section>
        </div>
      </div>
    </div>
  );
}
