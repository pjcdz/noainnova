# Data sources exploration for Anima

Date: 2026-09-24. Status: plan, nothing built yet.

## Goal

On 2026-09-20 the team described the data half of "prevención del suicidio as a service" in Discord #general: an open repository with the tools and public databases the platform draws from, so a government can audit how each number was obtained, and an interactive map a government would pay for. Before building any of that, one question needs an answer backed by files:

What can we show about suicide and its context in Salta with data anyone can download today, at what territorial grain, and what can only come from an agreement?

This exploration answers it. It produces a catalog of sources, the original files with their provenance, and a first set of real tables for Salta. It does not build the ETL, the observatory or the dashboard.

## Where this sits

On 2026-09-20 the team took "toda la parte de datos: ETL, fuentes públicas, observatorio, dashboard institucional funcionando" out of the Linear project for TechWeek BA 27/10. This exploration is a separate track and takes none of that project's 135 points.

It touches that project in one place. ANI-79 and ANI-80 plan a dashboard prototype with simulated Salta data. If step 3 produces real department-level tables, the team can choose to show them, labeled with their source, instead of invented numbers. That choice belongs to the team.

## What was verified on 2026-09-24

The 2026-09-20 bundle `anima_fuentes_DEIS_SNIC_SAT.zip` could not download the original files and transcribed two tables from the SNIC 2025 report instead. Today the originals download. This is what they hold for Salta:

| Source | File | Salta content | Finest grain |
|---|---|---|---|
| SNIC, Ministerio de Seguridad | `snic-departamentos-anual.csv`, 70 MB | Suicide victims per department per year, 2000-2025, with SNIC's rates. 243 in 2025, the report's figure. | Departamento: 23, plus 66999 "sin determinar" |
| SAT-SS, Ministerio de Seguridad | `SAT-SS-BU_2017-2024.csv`, 7.5 MB | One row per death, 1,465 rows for Salta in 2017-2024: locality, date, hour, place type, method, sex, age band. Locality is never empty. 84 localities; Salta capital has 584 rows. | Localidad |
| DEIS, Ministerio de Salud | `datos_sobre_defunciones_2024.csv` | Deaths by province of residence, sex, age group and ICD-10 cause. 190 Salta residents under X60-X84 in 2024. | Provincia |
| Boletín Epidemiológico Nacional 788 | PDF, SE 51 of 2025 | SNVS 2.0 suicide attempts from April 2023 to October 2025, 22,249 notifications, national tables only. The bulletin says the figures describe the rollout of notification, not the size of the problem. | País |
| datos.gob.ar | CKAN API | `package_search` answers. SEDRONAR publishes 8 datasets, among them "Base Línea 141" and the 2023 spatial distribution of its care network. REFES lists health establishments. Searches for "suicidio" and "salud mental" returned non-JSON twice. | Varies |

Three facts from this check shape the rest of the plan.

1. SAT-SS is the case-level base behind SNIC's suicide counts. Its Salta totals equal SNIC's in every year from 2017 to 2024: 192, 160, 168, 195, 178, 209, 184, 179. They are one registry, not two.
2. For 2024, DEIS counts 190 and SNIC counts 179. DEIS is health data by place of residence; SNIC is police data by place of occurrence. Neither is wrong, and one cannot be added to or swapped for the other.
3. No public source goes below locality. Salta capital is a single locality with 584 deaths in eight years. A map by barrio needs an agreement. A map by department or locality can be built now.

The files also show why joins must use codes. SNIC spells the same department two ways, "Cerrillos" next to "Cerrillos " and "General Güemes" next to "General Gúemes". SAT-SS writes some department codes without the province prefix, "112" next to "66112".

## Decisions

1. **Originals over transcriptions.** When a source publishes a file, we download that file. Transcribing a PDF table is the last resort, and the catalog row says it was transcribed and from which page.
2. **Every file has a manifest row** with URL, download time, size, SHA-256, and license or terms of use. The repository keeps the fetch script and the manifest, not the raw files, so anyone can rebuild the tables and see when a source changed. This is also the first piece of "la data se actualiza sola".
3. **Each source answers the five questions** Pablo posted on 2026-09-20: which variables, which territory, which period, how it is updated, what use is permitted. It also gets one measured fact, how complete it is for Salta.
4. **Joins go through INDEC codes**, province 66, department 66xxx and locality, never through names.
5. **Registries are compared, never summed.** When two registries count the same event, the catalog records both numbers and why they differ.
6. **Nothing leaves the exploration at case level.** SAT-SS gives date, hour, locality and method for each death, and in a small locality that is enough for neighbors to recognize the person. Outputs are aggregates with a minimum cell size, and method is never shown by small area, as WHO's media guidance on suicide advises. The proposal already commits to aggregated reading above a threshold, decision 9 in `presentacion-jueves/main.tex`.
7. **Context factors describe places, not people.** Unemployment, altitude, substance use or distance to services enter as area-level layers. Individual risk profiling is not part of this track.
8. **Chat hypotheses get a literature check first.** Altitude and hypoxia, substance abuse and bullying were raised on 2026-09-20. Each becomes a map layer only after the catalog records which studies support it and what they measured.

## Source families and how to reach them

| Family | Examples | Access | Tool | Status |
|---|---|---|---|---|
| Mortality and police registries | SNIC, SAT-SS, DEIS | Direct CSV | Fetch script | Verified |
| Attempt surveillance | SNVS 2.0 through the Boletín | National PDF tables; province and department only on request | PDF table extraction, access request | National only |
| Provincial and municipal services | Salta Ministerio de Salud, hospitals, CAPS, 911, help lines, Municipalidad | Reports, requests, agreements | Web search, Aside, request drafts | Not started |
| Population and living conditions | INDEC Censo 2022 through REDATAM, EPH | REDATAM online processing, EPH microdata | Aside for REDATAM, Python for EPH | Not started |
| Services and resources | REFES, SEDRONAR network 2023, Línea 141 | CKAN API | Fetch script | Datasets located |
| Surveys | Encuesta Mundial de Salud Escolar, ENFR | Microdata downloads | Python | Not started; check whether samples represent Salta |
| Geography | IGN, INDEC geometries | Downloads, WFS | Python | Not started |
| Search interest | Google Trends | Web export through Aside, or the official API if we get access | Aside | Not started |
| Literature | Google Scholar, SciELO, PubMed, UNSa and CONICET repositories | Search and reference chasing | Web search, Aside | Not started |
| Reference products | Zero Suicide Alliance data map, OHID Fingertips suicide prevention profile, CDC WISQARS | Their indicator lists and source notes | Web fetch, Aside | Not started |

## How to find everything that exists

The Discord list is the seed. Getting from it to everything published runs as a loop over each family:

1. Sweep catalogs through their API where one exists: datos.gob.ar CKAN, and provincial portals if Salta has one.
2. Sweep documents: reports, bulletins, yearbooks. A table taken from a PDF keeps its page number.
3. Sweep the literature on Salta and the NOA and follow references backwards. A study's methods section names the registry it used, and sometimes a grain no public file offers, which becomes a lead for a request.
4. Read the reference products' indicator lists. Each indicator becomes a search: does Argentina publish this, and where.
5. For dashboards that render in the browser, such as DEIS's reporte interactivo or REDATAM, open them in Aside and read the network requests to find the file or endpoint behind the chart. Download that instead of scraping the chart.
6. Record every query and its result in a discovery log. A family is done when new queries only return sources already in the catalog.
7. Data that exists but is not published goes to the requests list: who holds it, which aggregate to ask for, never individual records, and the legal route. Ley 27.275 covers national bodies; the provincial route is still to be checked.

Families run in parallel, one agent per family, each returning catalog rows. A row counts once the fetch script has downloaded its URL, or once it records why it cannot: login, agreement, dead link.

## Plan

Where the work lives is still open, see the questions below. The paths assume a `data/` folder in this repository until the new organization's repository exists.

### Step 1. Fetch the verified sources reproducibly

- Files: `data/fetch.py`, `data/sources.csv`, `data/manifest.csv`, `.gitignore` for `data/raw/`.
- Behavior: `python data/fetch.py` downloads SNIC departmental and provincial, SAT-SS, DEIS 2024 and the DEIS dictionary into `data/raw/`, and writes one manifest row per file.
- Check: a second run reports the same hashes or records the change. SAT-SS Salta totals equal SNIC's for 2017-2024.

### Step 2. One territorial key

- Files: `data/territory.py`, IGN or INDEC geometries, Censo 2022 population by department.
- Behavior: department and locality names in SNIC and SAT-SS resolve to INDEC codes.
- Check: all 23 Salta departments join. 66999 is reported apart. SAT-SS localities that match no geometry are listed by name.

### Step 3. First real tables for Salta

- Files: `data/build_salta.py`, `data/out/salta_departamento_anio.csv`, `data/out/salta_localidad_periodo.csv`.
- Behavior: suicides per department per year for 2000-2025 with SNIC's rates, and suicides per locality over multi-year windows, suppressed below the minimum cell size.
- Check: department sums give 243 for 2025 and 179 for 2024. No output cell is below the threshold. No output carries date, hour or method at locality level.

### Step 4. Catalog the rest of the seed list

- Files: `data/sources.csv`, `data/notes/<source>.md`.
- Behavior: every source from the Discord list has its five answers and its Salta coverage, or a written reason it has none.
- Check: each row has a fetched URL or a status of login, agreement or not found.

### Step 5. Discovery across the internet

- Files: `data/discovery-log.md`, `data/sources.csv`.
- Behavior: the loop above, per family, until new queries stop returning new sources.
- Check: the log shows each family's queries and where they stopped adding sources.

### Step 6. Requests and agreements

- Files: `data/requests.md`.
- Behavior: for each dataset that exists but is not published, such as SNVS attempts by department, provincial service activity, help line and 911 mental-health calls, or municipal surveys, the holder, the aggregate to ask for and the route. Drafts only; nothing is sent without the team.
- Check: every catalog row marked "agreement" has an entry.

### Step 7. Findings

- Files: `data/FINDINGS.md`.
- Behavior: which map can be built today and with which layers, what is missing and who holds it, and which chat hypotheses held up in the literature.
- Check: every number traces to a manifest row or to a request.

Steps 1 to 3 answer the main question with real data. Steps 4 to 7 are the deep part and can run in parallel once step 1 exists.

## Later, not in this exploration

- Automatic refresh in production, the ETL and the observatory. They belong to the platform stage.
- Loading SNVS or provincial records. That needs an agreement first.
- A model that classifies raw data, and any individual risk profile.
- Apple Health and Samsung Health. That is data each user authorizes inside the app, not public data, so it belongs to the app track.
- Social media collection, unless a platform offers aggregate topic volumes under its terms.

## Open questions

1. Where the data work lives: a `data/` folder here, or the new organization's repository from the start. ANI-47 creates that repository.
2. Whether the TechWeek prototype, ANI-79 and ANI-80, shows real department-level tables with their source instead of simulated data.
3. Whether this track gets its own Linear project. The "Kradia" project exists and is empty, and the name is still undecided, ANI-55, due 29/09.
4. The minimum cell size. The proposal leaves it to the Municipality as decision 9. The exploration will use a provisional value and state it.
