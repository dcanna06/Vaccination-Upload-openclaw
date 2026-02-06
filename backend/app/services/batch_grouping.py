"""Batch grouping service for vaccination records.

Groups parsed Excel rows into AIR-compliant batches:
- Groups rows by individual identity
- Sub-groups by date of service (encounters)
- Enforces max 5 episodes per encounter
- Enforces max 10 encounters per request
- Preserves original row numbers for error reporting
"""

from typing import Any

import structlog

logger = structlog.get_logger(__name__)

MAX_EPISODES_PER_ENCOUNTER = 5
MAX_ENCOUNTERS_PER_REQUEST = 10


def _individual_key(record: dict[str, Any]) -> str:
    """Generate a grouping key for an individual.

    Priority order per claude.md:
    1. Medicare card number + IRN + DOB + Gender
    2. IHI + DOB + Gender
    3. First name + Last name + DOB + Gender + Postcode
    """
    dob = record.get("dateOfBirth", "")
    gender = record.get("gender", "")

    medicare = record.get("medicareCardNumber")
    irn = record.get("medicareIRN")
    if medicare:
        return f"medicare:{medicare}:{irn or ''}:{dob}:{gender}"

    ihi = record.get("ihiNumber")
    if ihi:
        return f"ihi:{ihi}:{dob}:{gender}"

    first = (record.get("firstName") or "").upper()
    last = (record.get("lastName") or "").upper()
    postcode = record.get("postCode", "")
    return f"demo:{first}:{last}:{dob}:{gender}:{postcode}"


class BatchGroupingService:
    """Groups parsed records into AIR-compliant request batches."""

    def group(self, records: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Group parsed records into AIR request batches.

        Returns a list of batch dicts, each containing:
        - 'encounters': list of encounter dicts (max 10)
        - 'individual': individual identification fields
        - 'sourceRows': list of original row numbers in this batch
        """
        # Step 1: Group by individual
        individuals: dict[str, list[dict[str, Any]]] = {}
        for record in records:
            key = _individual_key(record)
            individuals.setdefault(key, []).append(record)

        # Step 2: Build encounters per individual
        all_encounters: list[dict[str, Any]] = []
        for _key, ind_records in individuals.items():
            encounters = self._build_encounters(ind_records)
            all_encounters.extend(encounters)

        # Step 3: Chunk encounters into batches of max 10
        batches = self._chunk_encounters(all_encounters)

        logger.info(
            "batch_grouping_complete",
            total_records=len(records),
            total_encounters=len(all_encounters),
            total_batches=len(batches),
        )
        return batches

    def _build_encounters(
        self, records: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Build encounters from records belonging to the same individual.

        Groups by dateOfService, splits episodes if >5 per encounter.
        """
        # Group by date of service
        by_date: dict[str, list[dict[str, Any]]] = {}
        for record in records:
            dos = record.get("dateOfService", "")
            by_date.setdefault(dos, []).append(record)

        encounters: list[dict[str, Any]] = []
        # Use first record for individual details
        individual = self._extract_individual(records[0])

        for dos, dos_records in by_date.items():
            # Build episodes from records for this date
            episodes: list[dict[str, Any]] = []
            for record in dos_records:
                episodes.append(self._extract_episode(record))

            # Split into chunks of max 5 episodes per encounter
            for chunk_idx in range(0, len(episodes), MAX_EPISODES_PER_ENCOUNTER):
                chunk = episodes[chunk_idx : chunk_idx + MAX_EPISODES_PER_ENCOUNTER]
                # Assign episode IDs (1-based, sequential within encounter)
                for ep_idx, ep in enumerate(chunk, start=1):
                    ep["id"] = str(ep_idx)

                # Get provider and encounter-level fields from first record in chunk
                first_record = dos_records[chunk_idx] if chunk_idx < len(dos_records) else dos_records[0]

                encounter: dict[str, Any] = {
                    "dateOfService": dos,
                    "episodes": chunk,
                    "individual": individual,
                    "sourceRows": [
                        r.get("rowNumber")
                        for r in dos_records[chunk_idx : chunk_idx + MAX_EPISODES_PER_ENCOUNTER]
                    ],
                }

                # Optional encounter-level fields
                provider = first_record.get("immunisingProviderNumber")
                if provider:
                    encounter["immunisationProvider"] = {"providerNumber": provider}

                if first_record.get("administeredOverseas"):
                    encounter["administeredOverseas"] = True
                    if first_record.get("countryCode"):
                        encounter["countryCode"] = first_record["countryCode"]

                if first_record.get("antenatalIndicator"):
                    encounter["antenatalIndicator"] = True

                if first_record.get("schoolId"):
                    encounter["schoolId"] = first_record["schoolId"]

                encounters.append(encounter)

        return encounters

    def _extract_individual(self, record: dict[str, Any]) -> dict[str, Any]:
        """Extract individual identification fields from a record."""
        individual: dict[str, Any] = {
            "personalDetails": {
                "dateOfBirth": record.get("dateOfBirth", ""),
                "gender": record.get("gender"),
            },
        }

        if record.get("firstName"):
            individual["personalDetails"]["firstName"] = record["firstName"]
        if record.get("lastName"):
            individual["personalDetails"]["lastName"] = record["lastName"]

        if record.get("medicareCardNumber"):
            individual["medicareCard"] = {
                "medicareCardNumber": record["medicareCardNumber"],
            }
            if record.get("medicareIRN"):
                individual["medicareCard"]["medicareIRN"] = record["medicareIRN"]

        if record.get("ihiNumber"):
            individual["ihiNumber"] = record["ihiNumber"]

        if record.get("postCode"):
            individual["address"] = {"postCode": record["postCode"]}

        return individual

    def _extract_episode(self, record: dict[str, Any]) -> dict[str, Any]:
        """Extract episode fields from a record."""
        episode: dict[str, Any] = {
            "vaccineCode": record.get("vaccineCode", ""),
            "vaccineDose": record.get("vaccineDose", ""),
        }

        if record.get("vaccineBatch"):
            episode["vaccineBatch"] = record["vaccineBatch"]
        if record.get("vaccineType"):
            episode["vaccineType"] = record["vaccineType"]
        if record.get("routeOfAdministration"):
            episode["routeOfAdministration"] = record["routeOfAdministration"]

        return episode

    def _chunk_encounters(
        self, encounters: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Chunk encounters into batches of max 10 encounters each.

        Each batch includes the individual data and source rows.
        """
        batches: list[dict[str, Any]] = []

        for i in range(0, len(encounters), MAX_ENCOUNTERS_PER_REQUEST):
            chunk = encounters[i : i + MAX_ENCOUNTERS_PER_REQUEST]

            # Assign encounter IDs (1-based, sequential within batch)
            for enc_idx, enc in enumerate(chunk, start=1):
                enc["id"] = str(enc_idx)

            # Collect all source rows for this batch
            all_source_rows: list[int] = []
            for enc in chunk:
                all_source_rows.extend(enc.get("sourceRows", []))

            batch: dict[str, Any] = {
                "encounters": chunk,
                "sourceRows": all_source_rows,
                "encounterCount": len(chunk),
            }
            batches.append(batch)

        return batches
