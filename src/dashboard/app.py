"""
SkyDelay Intelligence Dashboard v5 — Final Professional Version
Clean light theme, real US geography map, polished cascade analyzer.

Run: streamlit run src/dashboard/app.py
"""

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import duckdb
import pandas as pd
from pathlib import Path
import sys

st.set_page_config(page_title="SkyDelay Intelligence", page_icon="✈️", layout="wide", initial_sidebar_state="expanded")
DB_PATH = "data/skydelay.duckdb"

# ── Professional Light Theme ────────────────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    .stApp { background-color: #F8F9FB; font-family: 'Inter', sans-serif; }
    .block-container { padding-top: 1.5rem; max-width: 1200px; }
    
    [data-testid="stSidebar"] { background: #FFFFFF; border-right: 1px solid #E5E7EB; }
    
    [data-testid="stMetric"] {
        background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px;
        padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    [data-testid="stMetricValue"] {
        font-size: 1.7rem; font-weight: 700; color: #111827; letter-spacing: -0.02em;
    }
    [data-testid="stMetricLabel"] {
        color: #6B7280; font-size: 0.72rem; font-weight: 600;
        text-transform: uppercase; letter-spacing: 0.06em;
    }
    
    h1 { color: #111827 !important; font-weight: 700 !important; letter-spacing: -0.03em !important; }
    h2, h3 { color: #1F2937 !important; font-weight: 600 !important; }
    p, .stMarkdown { color: #4B5563; }
    
    .stButton > button {
        background: #111827; color: #FFFFFF; border: none; border-radius: 6px;
        font-weight: 600; padding: 0.6rem 1.5rem; font-size: 0.875rem;
        letter-spacing: 0.01em;
    }
    .stButton > button:hover { background: #1F2937; }
    .stButton > button:active { background: #111827; color: #FFFFFF; }
    
    [data-testid="stSelectbox"] label, [data-testid="stSlider"] label, .stMultiSelect label {
        color: #374151; font-weight: 600; font-size: 0.75rem;
        text-transform: uppercase; letter-spacing: 0.04em;
    }
    
    hr { border-color: #E5E7EB; margin: 1.2rem 0; }
    [data-testid="stDataFrame"] { border: 1px solid #E5E7EB; border-radius: 8px; }
    .stCaption { color: #9CA3AF !important; }
    
    .card-title {
        font-size: 0.75rem; font-weight: 600; color: #6B7280;
        text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px;
    }
</style>
""", unsafe_allow_html=True)


def chart_style(fig, h=400):
    fig.update_layout(
        paper_bgcolor="#FFFFFF", plot_bgcolor="#FAFBFC",
        font=dict(family="Inter, sans-serif", color="#4B5563", size=12),
        height=h, margin=dict(l=48, r=16, t=32, b=40),
        xaxis=dict(gridcolor="#F3F4F6", linecolor="#E5E7EB",
                   tickfont=dict(color="#6B7280", size=11)),
        yaxis=dict(gridcolor="#F3F4F6", linecolor="#E5E7EB",
                   tickfont=dict(color="#6B7280", size=11)),
        legend=dict(font=dict(color="#4B5563", size=11), bgcolor="rgba(0,0,0,0)"),
        hoverlabel=dict(bgcolor="#FFFFFF", font_size=12, font_family="Inter", bordercolor="#E5E7EB"),
    )
    return fig


C = {
    "blue": "#2563EB", "indigo": "#4F46E5", "green": "#059669",
    "amber": "#D97706", "red": "#DC2626", "slate": "#64748B",
    "seq": ["#2563EB", "#7C3AED", "#059669", "#D97706", "#DC2626", "#0891B2"],
    "risk": ["#059669", "#D97706", "#DC2626"],
    "blues": ["#EFF6FF", "#BFDBFE", "#60A5FA", "#2563EB", "#1E40AF"],
}


@st.cache_resource
def get_con():
    return duckdb.connect(DB_PATH, read_only=True)


def q(sql):
    return get_con().execute(sql).fetchdf()


# ── Sidebar ─────────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
    <div style="padding:8px 0 16px 0;">
        <div style="font-size:1.25rem;font-weight:700;color:#111827;">✈️ SkyDelay</div>
        <div style="font-size:0.7rem;font-weight:600;color:#9CA3AF;letter-spacing:0.08em;margin-top:2px;">
            INTELLIGENCE PLATFORM</div>
    </div>
    """, unsafe_allow_html=True)

    page = st.radio("", ["Overview", "Cascade Analyzer", "Route Economics", "Delay Patterns"],
                    label_visibility="collapsed")

    dr = q("SELECT min(flight_date) as mn, max(flight_date) as mx FROM mart_delay_economics")
    st.markdown("---")
    st.markdown(f"""
    <div style="font-size:0.72rem;line-height:1.8;">
        <div style="color:#9CA3AF;font-weight:600;letter-spacing:0.05em;">DATA RANGE</div>
        <div style="color:#4B5563;">{dr['mn'][0]} → {dr['mx'][0]}</div>
        <div style="color:#9CA3AF;font-weight:600;letter-spacing:0.05em;margin-top:8px;">SOURCES</div>
        <div style="color:#4B5563;">BTS · OpenSky · NOAA · FAA</div>
    </div>
    """, unsafe_allow_html=True)
    st.markdown("---")
    st.markdown("""
    <div style="font-size:0.72rem;line-height:1.6;">
        <div style="color:#4B5563;font-weight:500;">Built by Shreyas Dasari</div>
        <a href="https://github.com/ShreyasDasari" style="color:#2563EB;text-decoration:none;font-size:0.72rem;">GitHub</a>
        <span style="color:#D1D5DB;"> · </span>
        <a href="https://linkedin.com/in/shreyasdasari" style="color:#2563EB;text-decoration:none;font-size:0.72rem;">LinkedIn</a>
    </div>
    """, unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════
# PAGE 1: OVERVIEW
# ══════════════════════════════════════════════════════════════
if page == "Overview":
    st.markdown("""
    <div style="padding:0 0 20px 0;">
        <h1 style="font-size:1.75rem;margin:0 0 4px 0;">Flight Delay Economics</h1>
        <p style="color:#6B7280;font-size:0.9rem;margin:0;">
            Cascading cost analysis across 347 US airports · Sep–Nov 2025
        </p>
    </div>
    """, unsafe_allow_html=True)

    kpis = q("""
        SELECT sum(total_departures) as fl, round(avg(avg_dep_delay_min),1) as dl,
               round(avg(pct_delayed_15),1) as pct, round(sum(est_total_economic_impact),0) as cost
        FROM mart_delay_economics
    """)
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Flights Analyzed", f"{int(kpis['fl'][0]):,}")
    c2.metric("Avg Departure Delay", f"{kpis['dl'][0]} min")
    c3.metric("Delayed ≥15 min", f"{kpis['pct'][0]}%")
    c4.metric("Total Economic Impact", f"${int(kpis['cost'][0] / 1e6):,}M")

    st.markdown("---")

    # US Map
    st.markdown('<div class="card-title">Hub Vulnerability Map</div>', unsafe_allow_html=True)

    coords = {
        "ORD": (41.98, -87.90, "Chicago O'Hare"), "ATL": (33.64, -84.43, "Atlanta"),
        "DFW": (32.90, -97.04, "Dallas/Fort Worth"), "DEN": (39.86, -104.67, "Denver"),
        "LAX": (33.94, -118.41, "Los Angeles"), "JFK": (40.64, -73.78, "New York JFK"),
        "SFO": (37.62, -122.38, "San Francisco"), "SEA": (47.45, -122.31, "Seattle"),
        "MIA": (25.79, -80.29, "Miami"), "BOS": (42.36, -71.01, "Boston"),
        "EWR": (40.69, -74.17, "Newark"), "CLT": (35.21, -80.94, "Charlotte"),
        "PHX": (33.44, -112.01, "Phoenix"), "IAH": (29.98, -95.34, "Houston"),
        "MSP": (44.88, -93.22, "Minneapolis"), "DTW": (42.21, -83.35, "Detroit"),
        "LGA": (40.77, -73.87, "LaGuardia"), "PHL": (39.87, -75.24, "Philadelphia"),
        "DCA": (38.85, -77.04, "Washington DCA"), "SLC": (40.79, -111.98, "Salt Lake City"),
        "LAS": (36.08, -115.15, "Las Vegas"), "MCO": (28.43, -81.31, "Orlando"),
        "BNA": (36.12, -86.68, "Nashville"), "SAN": (32.73, -117.19, "San Diego"),
        "TPA": (27.98, -82.53, "Tampa"), "PDX": (45.59, -122.60, "Portland"),
    }

    vdf = q("SELECT airport, cascade_vulnerability_score as score, avg_delay_min, avg_pct_delayed, total_economic_impact as cost FROM mart_cascade_vulnerability ORDER BY vulnerability_rank LIMIT 26")
    map_rows = []
    for _, r in vdf.iterrows():
        if r["airport"] in coords:
            lat, lon, name = coords[r["airport"]]
            map_rows.append({"code": r["airport"], "name": name, "lat": lat, "lon": lon,
                             "score": r["score"], "delay": r["avg_delay_min"],
                             "pct": r["avg_pct_delayed"], "cost": r["cost"]})
    mdf = pd.DataFrame(map_rows)
    mdf["cost_m"] = mdf["cost"] / 1e6
    mdf["label"] = mdf["code"] + " — " + mdf["name"]
    mdf["risk"] = mdf["pct"].apply(lambda x: "High (>22%)" if x > 22 else "Moderate (18-22%)" if x > 18 else "Low (<18%)")

    fig_map = px.scatter_geo(
        mdf, lat="lat", lon="lon", size="cost_m", color="risk",
        hover_name="label",
        hover_data={"score": ":.1f", "delay": ":.1f", "pct": ":.1f", "cost_m": ":.1f",
                     "lat": False, "lon": False, "risk": False},
        size_max=35,
        color_discrete_map={"High (>22%)": "#DC2626", "Moderate (18-22%)": "#D97706", "Low (<18%)": "#059669"},
        labels={"cost_m": "Impact ($M)", "score": "Vuln. Score", "delay": "Avg Delay (min)", "pct": "% Delayed"},
    )
    fig_map.update_geos(
        scope="usa", bgcolor="#FAFBFC", lakecolor="#EFF6FF", landcolor="#F3F4F6",
        subunitcolor="#D1D5DB", countrycolor="#9CA3AF",
        showlakes=True, showsubunits=True, showcoastlines=True, coastlinecolor="#9CA3AF",
    )
    fig_map.update_layout(
        paper_bgcolor="#FFFFFF", font=dict(family="Inter", color="#4B5563"),
        height=440, margin=dict(l=0, r=0, t=10, b=0),
        legend=dict(title="Delay Rate", font=dict(size=11), bgcolor="rgba(255,255,255,0.9)",
                    bordercolor="#E5E7EB", borderwidth=1, x=0.01, y=0.99),
        hoverlabel=dict(bgcolor="#FFFFFF", font_size=12, font_family="Inter", bordercolor="#E5E7EB"),
    )
    fig_map.update_traces(marker=dict(line=dict(width=1, color="#FFFFFF"), opacity=0.85, sizemin=8))
    st.plotly_chart(fig_map, use_container_width=True)

    st.markdown("---")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown('<div class="card-title">Vulnerability Ranking — Top 12</div>', unsafe_allow_html=True)
        vc = q("SELECT airport, cascade_vulnerability_score as score, avg_pct_delayed as pct FROM mart_cascade_vulnerability ORDER BY vulnerability_rank LIMIT 12")
        fig = px.bar(vc, x="airport", y="score", color="pct",
                     color_continuous_scale=C["risk"], hover_data={"pct": ":.1f"})
        fig = chart_style(fig, 360)
        fig.update_layout(xaxis_title="", yaxis_title="Vulnerability Score",
                          coloraxis_colorbar=dict(title="% Del.", len=0.6, thickness=12))
        fig.update_traces(marker_line_width=0)
        st.plotly_chart(fig, use_container_width=True)

    with col2:
        st.markdown('<div class="card-title">Economic Impact — Top 12 ($M)</div>', unsafe_allow_html=True)
        tc = q("SELECT airport, round(total_economic_impact/1e6,1) as cost_m FROM mart_cascade_vulnerability ORDER BY total_economic_impact DESC LIMIT 12")
        fig2 = px.bar(tc, x="airport", y="cost_m", color="cost_m", color_continuous_scale=C["blues"])
        fig2 = chart_style(fig2, 360)
        fig2.update_layout(xaxis_title="", yaxis_title="Impact ($M)", coloraxis_showscale=False)
        fig2.update_traces(marker_line_width=0)
        st.plotly_chart(fig2, use_container_width=True)

    st.markdown('<div class="card-title">7-Day Rolling Avg Delay — Top 5 Hubs</div>', unsafe_allow_html=True)
    trend = q("SELECT flight_date, airport, rolling_7day_avg_delay FROM mart_delay_economics WHERE airport IN ('ORD','ATL','DFW','JFK','DEN') ORDER BY flight_date")
    fig3 = px.line(trend, x="flight_date", y="rolling_7day_avg_delay", color="airport",
                    color_discrete_sequence=C["seq"])
    fig3 = chart_style(fig3, 300)
    fig3.update_layout(xaxis_title="", yaxis_title="Avg Delay (min)", legend_title="")
    fig3.update_traces(line_width=2.2)
    st.plotly_chart(fig3, use_container_width=True)


# ══════════════════════════════════════════════════════════════
# PAGE 2: CASCADE ANALYZER
# ══════════════════════════════════════════════════════════════
elif page == "Cascade Analyzer":
    st.markdown("""
    <div style="padding:0 0 16px 0;">
        <h1 style="font-size:1.75rem;margin:0 0 4px 0;">Cascade Delay Simulator</h1>
        <p style="color:#6B7280;font-size:0.9rem;margin:0;">
            Model the downstream ripple effect of a hub airport delay.
        </p>
    </div>
    """, unsafe_allow_html=True)

    PROJECT_ROOT = str(Path(__file__).parent.parent.parent)
    sys.path.insert(0, PROJECT_ROOT)
    from src.processing.cascade_calculator import calculate_cascade_impact

    col1, col2, col3 = st.columns(3)
    airports = q("SELECT airport FROM mart_cascade_vulnerability ORDER BY vulnerability_rank LIMIT 30")["airport"].tolist()
    with col1:
        airport = st.selectbox("AIRPORT", airports, index=0)
    with col2:
        dates = q(f"SELECT DISTINCT flight_date FROM mart_delay_economics WHERE airport='{airport}' ORDER BY flight_date DESC")["flight_date"].tolist()
        selected_date = st.selectbox("DATE", dates[:30], index=0)
    with col3:
        delay = st.slider("DELAY (MINUTES)", 15, 240, 90, step=15)

    st.markdown("<div style='height:4px'></div>", unsafe_allow_html=True)

    if st.button("⏱  Run Cascade Analysis", use_container_width=True):
        con = duckdb.connect(DB_PATH, read_only=True)
        result = calculate_cascade_impact(con, airport, selected_date, delay)
        con.close()

        st.markdown("---")

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Direct Flights", f"{result.directly_affected_flights:,}")
        c2.metric("Cascade Flights", f"{result.cascade_affected_flights:,}")
        c3.metric("Passengers", f"{result.total_affected_passengers:,}")
        c4.metric("Economic Impact", f"${result.total_economic_impact:,.0f}")

        st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)

        col1, col2 = st.columns(2)
        with col1:
            st.markdown('<div class="card-title">Cost Allocation</div>', unsafe_allow_html=True)
            cd = pd.DataFrame({"Category": ["Passenger Cost", "Airline Ops Cost"],
                               "Amount": [result.estimated_passenger_cost, result.estimated_airline_cost]})
            fig = px.pie(cd, values="Amount", names="Category", hole=0.5,
                         color_discrete_sequence=[C["blue"], C["indigo"]])
            fig = chart_style(fig, 340)
            fig.update_traces(textinfo="percent+label", textfont=dict(size=13, color="#374151"),
                              marker=dict(line=dict(color="#FFFFFF", width=2)))
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            st.markdown('<div class="card-title">Top Cascade Destinations</div>', unsafe_allow_html=True)
            if result.affected_destinations:
                dd = q(f"""
                    SELECT dest, count(*) as flights, round(avg(depdelayminutes),0) as avg_delay
                    FROM raw_bts_flights WHERE origin='{airport}' AND flightdate='{selected_date}'
                      AND depdelayminutes>0 AND dest IN ({','.join(f"'{d}'" for d in result.affected_destinations[:10])})
                    GROUP BY dest ORDER BY flights DESC
                """)
                if not dd.empty:
                    fig2 = px.bar(dd, x="dest", y="flights", color="avg_delay",
                                  color_continuous_scale=C["risk"])
                    fig2 = chart_style(fig2, 340)
                    fig2.update_layout(xaxis_title="", yaxis_title="Affected Flights",
                                       coloraxis_colorbar=dict(title="Delay", len=0.6, thickness=12))
                    fig2.update_traces(marker_line_width=0)
                    st.plotly_chart(fig2, use_container_width=True)
            else:
                st.info("No cascade detected for this configuration.")

        # Summary insight box
        st.markdown(f"""
        <div style="background:#F0F7FF;border:1px solid #BFDBFE;border-radius:8px;padding:16px 20px;margin-top:8px;">
            <div style="font-size:0.75rem;font-weight:600;color:#1E40AF;margin-bottom:4px;letter-spacing:0.05em;">
                ANALYSIS SUMMARY</div>
            <div style="color:#1E3A5F;font-size:0.9rem;line-height:1.6;">
                A <strong>{delay}-minute delay</strong> at <strong>{airport}</strong> on {selected_date}
                would cascade to <strong>{result.cascade_affected_flights:,} downstream flights</strong>,
                affecting <strong>{result.total_affected_passengers:,} passengers</strong> with an estimated
                total economic impact of <strong>${result.total_economic_impact:,.0f}</strong>.
            </div>
        </div>
        """, unsafe_allow_html=True)

        st.markdown("<div style='height:8px'></div>", unsafe_allow_html=True)
        st.caption("Methodology: FAA/NEXTOR II Total Delay Impact Study (inflation-adjusted 2025). "
                   "Passenger: $0.74/min. Airline ops: $68.48/min/flight. Load factor: 87%. Avg seats: 160.")


# ══════════════════════════════════════════════════════════════
# PAGE 3: ROUTE ECONOMICS
# ══════════════════════════════════════════════════════════════
elif page == "Route Economics":
    st.markdown("""
    <div style="padding:0 0 16px 0;">
        <h1 style="font-size:1.75rem;margin:0 0 4px 0;">Route Economics</h1>
        <p style="color:#6B7280;font-size:0.9rem;margin:0;">
            Identifying routes with the highest delay-driven economic losses.
        </p>
    </div>
    """, unsafe_allow_html=True)

    col1, col2 = st.columns(2)
    with col1:
        mf = st.slider("MINIMUM FLIGHTS", 50, 500, 100, step=50)
    with col2:
        causes = st.multiselect("DELAY CAUSE", ["Weather", "Carrier", "NAS/ATC", "Late Aircraft"],
                                default=["Weather", "Carrier", "NAS/ATC", "Late Aircraft"])

    cs = ",".join(f"'{c}'" for c in causes)
    routes = q(f"""
        SELECT route_id, airline_iata, total_flights, pct_delayed, avg_dep_delay,
               est_total_economic_impact, est_cost_per_flight, dominant_delay_cause
        FROM mart_route_economics WHERE total_flights>={mf} AND dominant_delay_cause IN ({cs})
        ORDER BY est_total_economic_impact DESC LIMIT 30
    """)

    fig = px.scatter(routes, x="total_flights", y="est_total_economic_impact",
        color="dominant_delay_cause", size="pct_delayed", size_max=22,
        hover_data=["route_id", "airline_iata", "avg_dep_delay", "est_cost_per_flight"],
        color_discrete_map={"Weather": C["blue"], "Carrier": C["red"],
                            "NAS/ATC": C["green"], "Late Aircraft": C["amber"]})
    fig = chart_style(fig, 460)
    fig.update_layout(xaxis_title="Total Flights (3 months)", yaxis_title="Economic Impact ($)", legend_title="")
    fig.update_traces(marker=dict(line=dict(width=1, color="#FFFFFF")))
    st.plotly_chart(fig, use_container_width=True)

    st.markdown('<div class="card-title">Top Routes by Economic Impact</div>', unsafe_allow_html=True)
    df = routes.head(15)[["route_id", "airline_iata", "total_flights", "pct_delayed",
         "avg_dep_delay", "est_total_economic_impact", "dominant_delay_cause"]].copy()
    df.columns = ["Route", "Airline", "Flights", "% Delayed", "Avg Delay (min)", "Total Cost ($)", "Cause"]
    df["Total Cost ($)"] = df["Total Cost ($)"].apply(lambda x: f"${x:,.0f}")
    st.dataframe(df, use_container_width=True, hide_index=True)


# ══════════════════════════════════════════════════════════════
# PAGE 4: DELAY PATTERNS
# ══════════════════════════════════════════════════════════════
elif page == "Delay Patterns":
    st.markdown("""
    <div style="padding:0 0 16px 0;">
        <h1 style="font-size:1.75rem;margin:0 0 4px 0;">Delay Patterns</h1>
        <p style="color:#6B7280;font-size:0.9rem;margin:0;">
            Temporal and causal analysis of US domestic flight delays.
        </p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown('<div class="card-title">Delay Rate — Day of Week × Month</div>', unsafe_allow_html=True)
    hm = q("SELECT day_name, month, round(avg(pct_delayed_15),1) as v FROM mart_delay_economics GROUP BY day_name, month")
    day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    pivot = hm.pivot(index="day_name", columns="month", values="v").reindex(day_order)
    pivot.columns = [f"Month {int(c)}" for c in pivot.columns]

    fig = px.imshow(pivot, text_auto=True, aspect="auto",
                     color_continuous_scale=["#F0FDF4", "#FEF3C7", "#FEE2E2", "#DC2626"])
    fig = chart_style(fig, 300)
    fig.update_layout(coloraxis_colorbar=dict(title="% Del.", len=0.6, thickness=12))
    st.plotly_chart(fig, use_container_width=True)

    st.markdown("---")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown('<div class="card-title">Delay Cause Distribution</div>', unsafe_allow_html=True)
        cs_data = q("""
            SELECT sum(weather_delays) as Weather, sum(carrier_delays) as Carrier,
                   sum(nas_delays) as "NAS/ATC", sum(late_aircraft_delays) as "Late Aircraft"
            FROM mart_delay_economics
        """).melt(var_name="Cause", value_name="Count")
        fig2 = px.pie(cs_data, values="Count", names="Cause", hole=0.5,
                       color_discrete_sequence=[C["blue"], C["red"], C["green"], C["amber"]])
        fig2 = chart_style(fig2, 340)
        fig2.update_traces(textinfo="percent+label", textfont=dict(size=12, color="#374151"),
                           marker=dict(line=dict(color="#FFFFFF", width=2)))
        st.plotly_chart(fig2, use_container_width=True)

    with col2:
        st.markdown('<div class="card-title">Daily Economic Impact</div>', unsafe_allow_html=True)
        ap = st.selectbox("AIRPORT", ["ORD", "ATL", "DFW", "JFK", "DEN", "LAX", "EWR", "BOS"])
        dc = q(f"SELECT flight_date, est_total_economic_impact as cost FROM mart_delay_economics WHERE airport='{ap}' ORDER BY flight_date")
        fig3 = px.bar(dc, x="flight_date", y="cost", color_discrete_sequence=[C["blue"]])
        fig3 = chart_style(fig3, 310)
        fig3.update_layout(xaxis_title="", yaxis_title="Daily Cost ($)")
        fig3.update_traces(marker_line_width=0, opacity=0.85)
        st.plotly_chart(fig3, use_container_width=True)