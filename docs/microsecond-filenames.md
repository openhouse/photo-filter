# Micro-second-precise Filenames

**Since v2.3 (2025-06-15)** every exported JPEG is named

```
YYYYMMDD-HHMMSSffffff-original_name.jpg
```

- `ffffff` = micro-seconds (six digits) from Photos’ metadata
- filenames are **globally unique** within an export run
- simple `ls | sort` now yields the true chronological sequence
- no post-export renaming or “-1”, “-2”… collision suffixes are needed

### Troubleshooting

| symptom                                                                 | likely cause                                                            | fix                                                                                  |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Several photos taken _exactly_ in the same µs (rare) appear reversed    | Photos DB sometimes stores only ms for bursts                           | The order is still stable; use the existing “score” sort if human curation is needed |
| Filenames look like `20221105-081709000000…` for shots you know have µs | iPhone / some scanners don’t embed sub-seconds                          | This is expected; `000000` padding keeps ordering consistent                         |
| Old exports still show second-precision names                           | Delete `data/albums/<UUID>` and re-hit the API – they’ll be regenerated |

---

_Last updated 2025-06-15_
