# Document Series Engine Specification

## Purpose
The Document Series engine defines how document numbers are configured and generated in a reusable, auditable way, independent from document implementation details.

## Separation of Concerns
- Document Series is managed as an independent module.
- Documents only store the generated document number and series reference.
- Numbering logic stays outside document forms and UI components.

## Template Model
Supported placeholders:
- `{PROJECT}`
- `{YYYY}`
- `{MM}`
- `{DD}`
- `{SEQ}`

Examples:
- `PR-{YYYY}-{SEQ}`
- `INV/{PROJECT}/{YYYY}/{SEQ}`
- `CNT-{YYYY}{MM}-{SEQ}`

## Series Configuration
Each series supports:
- `SeriesId`
- `SeriesName`
- `Template`
- `SequenceStart`
- `SequencePadding`
- `ResetPolicy` (`None` | `Yearly` | `Monthly` | `Daily`)
- `GenerateOn` (`Submit` | `Approval`)
- `IsActive`
- `IsDefault`

Compatibility fields currently used by existing APIs:
- `SeriesCode`
- `NextNumber`

## Assignment Scope
Series assignment can be configured by:
- Project
- Document Type
- Project + Document Type (recommended)

## Generation Timing
Document numbers are generated only at controlled lifecycle points:
- On submit
- On final approval

## Safety and Audit Requirements (Backend)
- Concurrency-safe sequence allocation.
- Atomic increment operations.
- Duplicate prevention.
- Persist generation audit: generated number, series id, timestamp.

## UI Requirements
Admin management screen supports:
- Create/edit/deactivate series.
- Template, reset policy, and generation timing setup.
- Live preview of generated number from template + sequence settings.

