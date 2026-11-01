"""Types, colors, front and notes for the 'Where the soldiers came from' flow map. Arrow widths come from recruit_inputs.py (people recruited); named dead is the secondary measure.
Russian districts: sums of regions.json (Mediazona regional pages, 23 Oct 2026) by how the man joined. Foreign countries: BBC News Russian with
Mediazona, 10 Jul 2026. Anything without a sourced count is not drawn (see SKIPPED)."""
TYPES = {"vol": ("Volunteers and contract soldiers", "#e43d3c"), "mob": ("Mobilized", "#2ec4b6"), "pri": ("Prisoners, incl. Wagner and Storm-Z", "#e8c547"),
         "for": ("Foreign nationals, incl. North Korea", "#4f9dff")}
FRONT = dict(ll=[37.6, 48.4], name="Front in Ukraine (east and south)")
KURSK = dict(ll=[36.19, 51.73], name="Kursk region")
SKIPPED = ("Not drawn: any split of the national totals by region or district, because no outlet publishes recruitment counts by region for any type "
           "(the regional figures that exist cover 11 to 37 regions, are charts only, or count a recruiter's subset). Foreign countries without a single place on this map are listed above. "
           "North Korean soldiers are the only foreign group shown by troops committed rather than contracts signed.")
