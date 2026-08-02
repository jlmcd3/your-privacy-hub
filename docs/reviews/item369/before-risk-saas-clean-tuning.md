{
  "schema_version": "cppa_risk_v4",
  "document_metadata": {
    "tool": "cppa_risk_assessment",
    "render_plan_version": "v1",
    "build_stamp": "item369-preview@2026-08-02",
    "jurisdiction_tag": "cppa-ca"
  },
  "attestation_block": {
    "text": "This assessment must be reviewed and attested to by qualified legal counsel before operational reliance. The Company remains responsible for the accuracy of the underlying intake and for its determination under 11 CCR § 7152.",
    "attested": false
  },
  "disclaimer": "This document is not legal advice and must be reviewed by qualified legal counsel before any operational use or reliance.",
  "framework_disclaimer": "This assessment is structured against the framework of the CCPA and its implementing regulations (11 CCR §§ 7150–7157). It is a documentation aid, not a legal opinion.",
  "accuracy_caveat": "The analytical outputs in this document are computed deterministically from the intake record and the corpus-verified statutory anchors. Facts that are silent on the record are omitted, never invented.",
  "domains": [
    "cppa-ca"
  ],
  "_meta": {
    "internal": {
      "factor_table": [
        {
          "factor_id": "benefit.business",
          "kind": "benefit",
          "jurisdiction_tag": "cppa-ca",
          "present_in_intake": true,
          "intake_ledger_refs": [
            "L.a4_benefit_business"
          ],
          "guidance_refs": [
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152(a)(4)",
              "page_ref": "p. 35",
              "anchor_hint": "identify benefits in specific, non-generic terms; 'as applicable' allows differential stakeholder coverage",
              "authority_weight": "binding"
            },
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152(a)(4)",
              "page_ref": "Appendix, p. 139",
              "anchor_hint": "benefits from data processing may apply to different categories of stakeholders rather than accruing universally",
              "authority_weight": "binding"
            }
          ],
          "anchor": {
            "corpus_key": "cppa-7152",
            "pinpoint": "11 CCR § 7152(a)(4)"
          },
          "display_label": "Benefits to the business"
        },
        {
          "factor_id": "benefit.consumer",
          "kind": "benefit",
          "jurisdiction_tag": "cppa-ca",
          "present_in_intake": true,
          "intake_ledger_refs": [
            "L.a4_benefit_consumer"
          ],
          "guidance_refs": [
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152(a)(4)",
              "page_ref": "p. 35",
              "anchor_hint": "identify benefits in specific, non-generic terms; 'as applicable' allows differential stakeholder coverage",
              "authority_weight": "binding"
            },
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152(a)(4)",
              "page_ref": "Appendix, p. 139",
              "anchor_hint": "benefits from data processing may apply to different categories of stakeholders rather than accruing universally",
              "authority_weight": "binding"
            }
          ],
          "anchor": {
            "corpus_key": "cppa-7152",
            "pinpoint": "11 CCR § 7152(a)(4)"
          },
          "display_label": "Benefits to the consumer"
        },
        {
          "factor_id": "benefit.other_stakeholders",
          "kind": "benefit",
          "jurisdiction_tag": "cppa-ca",
          "present_in_intake": true,
          "intake_ledger_refs": [
            "L.a4_benefit_other_stakeholders"
          ],
          "guidance_refs": [
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152(a)(4)",
              "page_ref": "p. 35",
              "anchor_hint": "identify benefits in specific, non-generic terms; 'as applicable' allows differential stakeholder coverage",
              "authority_weight": "binding"
            },
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152(a)(4)",
              "page_ref": "Appendix, p. 139",
              "anchor_hint": "benefits from data processing may apply to different categories of stakeholders rather than accruing universally",
              "authority_weight": "binding"
            }
          ],
          "anchor": {
            "corpus_key": "cppa-7152",
            "pinpoint": "11 CCR § 7152(a)(4)"
          },
          "display_label": "Benefits to other stakeholders"
        },
        {
          "factor_id": "benefit.public",
          "kind": "benefit",
          "jurisdiction_tag": "cppa-ca",
          "present_in_intake": true,
          "intake_ledger_refs": [
            "L.a4_benefit_public"
          ],
          "guidance_refs": [
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152(a)(4)",
              "page_ref": "p. 35",
              "anchor_hint": "identify benefits in specific, non-generic terms; 'as applicable' allows differential stakeholder coverage",
              "authority_weight": "binding"
            },
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152(a)(4)",
              "page_ref": "Appendix, p. 139",
              "anchor_hint": "benefits from data processing may apply to different categories of stakeholders rather than accruing universally",
              "authority_weight": "binding"
            }
          ],
          "anchor": {
            "corpus_key": "cppa-7152",
            "pinpoint": "11 CCR § 7152(a)(4)"
          },
          "display_label": "Benefits to the public"
        },
        {
          "factor_id": "neg.a.unauthorized_access",
          "kind": "negative_impact",
          "jurisdiction_tag": "cppa-ca",
          "present_in_intake": true,
          "intake_ledger_refs": [
            "L.a5_harm_pathways"
          ],
          "guidance_refs": [
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152",
              "page_ref": "Appendix, p. 134",
              "anchor_hint": "balance privacy risks against broader benefits to various stakeholders",
              "authority_weight": "binding"
            }
          ],
          "anchor": {
            "corpus_key": "cppa-7152",
            "pinpoint": "11 CCR § 7152(a)(5)(A)"
          },
          "display_label": "Unauthorized access, destruction, use, modification, or disclosure"
        },
        {
          "factor_id": "neg.b.discrimination",
          "kind": "negative_impact",
          "jurisdiction_tag": "cppa-ca",
          "present_in_intake": false,
          "intake_ledger_refs": [],
          "guidance_refs": [
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152",
              "page_ref": "Appendix, p. 130",
              "anchor_hint": "transparency, accountability, and harm mitigation measures for ADMT",
              "authority_weight": "binding"
            }
          ],
          "anchor": {
            "corpus_key": "cppa-7152",
            "pinpoint": "11 CCR § 7152(a)(5)(B)"
          },
          "display_label": "Discrimination on protected characteristics"
        },
        {
          "factor_id": "neg.c.impaired_control",
          "kind": "negative_impact",
          "jurisdiction_tag": "cppa-ca",
          "present_in_intake": true,
          "intake_ledger_refs": [
            "L.a5_harm_pathways"
          ],
          "guidance_refs": [
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152(a)(5)",
              "page_ref": "p. 36",
              "anchor_hint": "insufficient disclosure for informed decision-making is covered under (a)(5)(C)'s impairing-control prohibition",
              "authority_weight": "binding"
            }
          ],
          "anchor": {
            "corpus_key": "cppa-7152",
            "pinpoint": "11 CCR § 7152(a)(5)(C)"
          },
          "display_label": "Impairing consumers' control over their personal information"
        },
        {
          "factor_id": "neg.d.coercion_dark_patterns",
          "kind": "negative_impact",
          "jurisdiction_tag": "cppa-ca",
          "present_in_intake": false,
          "intake_ledger_refs": [],
          "guidance_refs": [
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152(a)(5)(D)",
              "page_ref": "p. 36",
              "anchor_hint": "(a)(5)(D) modified to add dark-pattern example demonstrating consent that fails the 'freely given' standard",
              "authority_weight": "binding"
            },
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152(a)(5)",
              "page_ref": "Appendix, p. 141",
              "anchor_hint": "coercion example retained as helpful guidance for identifying compelled-processing harms",
              "authority_weight": "binding"
            }
          ],
          "anchor": {
            "corpus_key": "cppa-7152",
            "pinpoint": "11 CCR § 7152(a)(5)(D)"
          },
          "display_label": "Coercion or compulsion (including dark patterns)"
        },
        {
          "factor_id": "neg.e.economic_harms",
          "kind": "negative_impact",
          "jurisdiction_tag": "cppa-ca",
          "present_in_intake": false,
          "intake_ledger_refs": [],
          "guidance_refs": [
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152(a)(5)(E)",
              "page_ref": "p. 36",
              "anchor_hint": "'based upon profiling' added to clarify one pathway through which processing causes economic injury to consumers (FSOR filed under pre-modification (a)(5)(F) label; substance addresses (a)(5)(E) economic harms)",
              "authority_weight": "binding"
            }
          ],
          "anchor": {
            "corpus_key": "cppa-7152",
            "pinpoint": "11 CCR § 7152(a)(5)(E)"
          },
          "display_label": "Economic harms"
        },
        {
          "factor_id": "neg.f.physical_harms",
          "kind": "negative_impact",
          "jurisdiction_tag": "cppa-ca",
          "present_in_intake": false,
          "intake_ledger_refs": [],
          "guidance_refs": [],
          "anchor": {
            "corpus_key": "cppa-7152",
            "pinpoint": "11 CCR § 7152(a)(5)(F)"
          },
          "display_label": "Physical harms"
        },
        {
          "factor_id": "neg.g.reputational_harms",
          "kind": "negative_impact",
          "jurisdiction_tag": "cppa-ca",
          "present_in_intake": false,
          "intake_ledger_refs": [],
          "guidance_refs": [
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152(a)(5)(G)",
              "page_ref": "Appendix, p. 141",
              "anchor_hint": "reputational-harm examples retained as necessary business guidance for identifying stigmatization risks",
              "authority_weight": "binding"
            },
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152",
              "page_ref": null,
              "anchor_hint": "'would' changed to 'could' in (G)/(H); stigmatization example expanded to show disclosure outside expected context",
              "authority_weight": "binding"
            }
          ],
          "anchor": {
            "corpus_key": "cppa-7152",
            "pinpoint": "11 CCR § 7152(a)(5)(G)"
          },
          "display_label": "Reputational harms"
        },
        {
          "factor_id": "neg.h.psychological_harms",
          "kind": "negative_impact",
          "jurisdiction_tag": "cppa-ca",
          "present_in_intake": false,
          "intake_ledger_refs": [],
          "guidance_refs": [
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152(a)(5)",
              "page_ref": "Appendix, p. 142",
              "anchor_hint": "psychological-harm list is nonexhaustive; businesses need not perform expert-level mental-health assessments",
              "authority_weight": "binding"
            },
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152",
              "page_ref": null,
              "anchor_hint": "'would' changed to 'could' in (G)/(H); 'disclosure' added to emotional-distress example for sensitive health information",
              "authority_weight": "binding"
            }
          ],
          "anchor": {
            "corpus_key": "cppa-7152",
            "pinpoint": "11 CCR § 7152(a)(5)(H)"
          },
          "display_label": "Psychological harms"
        },
        {
          "factor_id": "safe.i.technical_controls",
          "kind": "safeguard",
          "jurisdiction_tag": "cppa-ca",
          "present_in_intake": true,
          "intake_ledger_refs": [
            "L.a6_safeguards"
          ],
          "guidance_refs": [
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152",
              "page_ref": null,
              "anchor_hint": "clarified risk assessment documentation requirements under 11 CCR § 7152(a) to streamline safeguards",
              "authority_weight": "binding"
            }
          ],
          "anchor": {
            "corpus_key": "cppa-7152",
            "pinpoint": "11 CCR § 7152(a)(6)(A)(i)"
          },
          "display_label": "Technical / architectural controls"
        },
        {
          "factor_id": "safe.ii.privacy_enhancing_technologies",
          "kind": "safeguard",
          "jurisdiction_tag": "cppa-ca",
          "present_in_intake": false,
          "intake_ledger_refs": [],
          "guidance_refs": [],
          "anchor": {
            "corpus_key": "cppa-7152",
            "pinpoint": "11 CCR § 7152(a)(6)(A)(ii)"
          },
          "display_label": "Privacy-enhancing technologies"
        },
        {
          "factor_id": "safe.iii.external_consultation",
          "kind": "safeguard",
          "jurisdiction_tag": "cppa-ca",
          "present_in_intake": false,
          "intake_ledger_refs": [],
          "guidance_refs": [],
          "anchor": {
            "corpus_key": "cppa-7152",
            "pinpoint": "11 CCR § 7152(a)(6)(A)(iii)"
          },
          "display_label": "External consultation / knowledge of emergent risks"
        },
        {
          "factor_id": "safe.iv.admt_governance",
          "kind": "safeguard",
          "jurisdiction_tag": "cppa-ca",
          "present_in_intake": false,
          "intake_ledger_refs": [],
          "guidance_refs": [
            {
              "source_table": "cppa_fsor_commentary",
              "regulation_citation": "11 CCR § 7152",
              "page_ref": "p. 37",
              "anchor_hint": "businesses using ADMT in risk assessments must identify specific evaluations, policies, procedures, and training",
              "authority_weight": "binding"
            }
          ],
          "anchor": {
            "corpus_key": "cppa-7152",
            "pinpoint": "11 CCR § 7152(a)(6)(A)(iv)"
          },
          "display_label": "ADMT governance policies and training"
        }
      ],
      "balance_mode": "firm",
      "projection_version": "cppa-risk-customer-projection@2026-08-01-item354",
      "emit_gate": {
        "version": "eg-w1-2026-07-25",
        "tool": "cppa_risk_assessment",
        "degraded_count": 0,
        "prose_node_count": 91,
        "findings": [],
        "customer_rows_filtered": 0
      },
      "serializer": {
        "version": "rs-w1-2026-07-25",
        "tool": "cppa_risk_assessment",
        "dropped_keys": [
          "_meta.render_plan_version",
          "_meta.propositions",
          "_meta.factor_rows",
          "_meta.citation_bindings",
          "citation_ledger[0].pinpoint_ref",
          "citation_ledger[0].corpus_key",
          "citation_ledger[0].pinpoint",
          "citation_ledger[0].jurisdiction_tag",
          "citation_ledger[0].authority_weight",
          "citation_ledger[1].pinpoint_ref",
          "citation_ledger[1].corpus_key",
          "citation_ledger[1].pinpoint",
          "citation_ledger[1].jurisdiction_tag",
          "citation_ledger[1].authority_weight",
          "citation_ledger[2].pinpoint_ref",
          "citation_ledger[2].corpus_key",
          "citation_ledger[2].pinpoint",
          "citation_ledger[2].jurisdiction_tag",
          "citation_ledger[2].authority_weight",
          "citation_ledger[3].pinpoint_ref",
          "citation_ledger[3].corpus_key",
          "citation_ledger[3].pinpoint",
          "citation_ledger[3].jurisdiction_tag",
          "citation_ledger[3].authority_weight",
          "citation_ledger[4].pinpoint_ref",
          "citation_ledger[4].corpus_key",
          "citation_ledger[4].pinpoint",
          "citation_ledger[4].jurisdiction_tag",
          "citation_ledger[4].authority_weight",
          "citation_ledger[5].pinpoint_ref",
          "citation_ledger[5].corpus_key",
          "citation_ledger[5].pinpoint",
          "citation_ledger[5].jurisdiction_tag",
          "citation_ledger[5].authority_weight",
          "citation_ledger[6].pinpoint_ref",
          "citation_ledger[6].corpus_key",
          "citation_ledger[6].pinpoint",
          "citation_ledger[6].jurisdiction_tag",
          "citation_ledger[6].authority_weight",
          "citation_ledger[7].pinpoint_ref",
          "citation_ledger[7].corpus_key",
          "citation_ledger[7].pinpoint",
          "citation_ledger[7].jurisdiction_tag",
          "citation_ledger[7].authority_weight",
          "citation_ledger[8].pinpoint_ref",
          "citation_ledger[8].corpus_key",
          "citation_ledger[8].pinpoint",
          "citation_ledger[8].jurisdiction_tag",
          "citation_ledger[8].authority_weight",
          "citation_ledger[9].pinpoint_ref",
          "citation_ledger[9].corpus_key",
          "citation_ledger[9].pinpoint",
          "citation_ledger[9].jurisdiction_tag",
          "citation_ledger[9].authority_weight",
          "citation_ledger[10].pinpoint_ref",
          "citation_ledger[10].corpus_key",
          "citation_ledger[10].pinpoint",
          "citation_ledger[10].jurisdiction_tag",
          "citation_ledger[10].authority_weight",
          "citation_ledger[11].pinpoint_ref",
          "citation_ledger[11].corpus_key",
          "citation_ledger[11].pinpoint",
          "citation_ledger[11].jurisdiction_tag",
          "citation_ledger[11].authority_weight",
          "citation_ledger[12].pinpoint_ref",
          "citation_ledger[12].corpus_key",
          "citation_ledger[12].pinpoint",
          "citation_ledger[12].jurisdiction_tag",
          "citation_ledger[12].authority_weight",
          "citation_ledger[13].pinpoint_ref",
          "citation_ledger[13].corpus_key",
          "citation_ledger[13].pinpoint",
          "citation_ledger[13].jurisdiction_tag",
          "citation_ledger[13].authority_weight",
          "citation_ledger[14].pinpoint_ref",
          "citation_ledger[14].corpus_key",
          "citation_ledger[14].pinpoint",
          "citation_ledger[14].jurisdiction_tag",
          "citation_ledger[14].authority_weight",
          "citation_ledger[15].pinpoint_ref",
          "citation_ledger[15].corpus_key",
          "citation_ledger[15].pinpoint",
          "citation_ledger[15].jurisdiction_tag",
          "citation_ledger[15].authority_weight"
        ],
        "dropped_count": 84
      },
      "engine_path": "ltp",
      "generator": "generate-cppa-risk@2026-08-01-item357",
      "ltp": {
        "record_needs": {
          "missing_data": 0,
          "reserved_decision": 1,
          "reserved_need_ids": [
            "need.j.initiation_decision"
          ]
        },
        "build_stamp": "item369-preview@2026-08-02",
        "generator_stamp": "generate-cppa-risk@2026-08-01-item357",
        "engine_path": "ltp",
        "mode": "enforce",
        "pass1_mode": "deterministic",
        "pass1_manifest": {
          "stamp": "ltp-pass1-llm-item261-grounded-observe@2026-07-29",
          "prompt_version": "pass1-derive-2026-07-29-item257-factor-refs",
          "model": "claude-sonnet-4-6",
          "max_attempts": 2,
          "timeout_enforced": "abort-controller"
        },
        "pass2r_manifest": {
          "stamp": "ltp-pass2r-llm-2026-07-30-item278",
          "model": "claude-sonnet-4-6",
          "prompt_version": "pass2r-prose-2026-08-01-item358",
          "validators_version": "ltp-pass2r-validators-2026-07-30-item287-residual",
          "max_attempts": 3,
          "per_attempt_timeout_ms": 170000,
          "stage_ceiling_ms": 360000,
          "max_tokens": 6000
        },
        "pass1_telemetry": {
          "ok": true,
          "attempts": 0,
          "write_around": false,
          "latency_ms": 0,
          "error": null,
          "deterministic": true
        },
        "assembler_telemetry": {
          "version": "ltp-pass2-assembler-2026-07-28-item244-addendum",
          "sections": [
            {
              "key": "schema_version",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "document_metadata",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "attestation_block",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "disclaimer",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "framework_disclaimer",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "accuracy_caveat",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "domains",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "_meta",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "overall_score",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "risk_level",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "opening_summary",
              "owner_kind": "harvest",
              "template_ids_rendered": [],
              "render_errors": [
                "harvest_missing_or_empty"
              ],
              "emitted": false,
              "omitted_reason": "harvest_rejected"
            },
            {
              "key": "submission_summary",
              "owner_kind": "harvest",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "executive_summary",
              "owner_kind": "template",
              "template_ids_rendered": [
                "T.risk.exec.primary_subject_lead",
                "T.risk.exec.firm"
              ],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "assessment_summary",
              "owner_kind": "template",
              "template_ids_rendered": [
                "T.risk.balance.firm",
                "T.risk.summary.docs"
              ],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "scope_and_triggers",
              "owner_kind": "template",
              "template_ids_rendered": [
                "T.risk.section_opener.scope.v2",
                "T.risk.applicability.engaged",
                "T.risk.applicability.not_engaged",
                "T.risk.applicability.not_engaged",
                "T.risk.applicability.not_engaged",
                "T.risk.applicability.not_engaged",
                "T.risk.applicability.not_engaged"
              ],
              "render_errors": [
                "T.risk.section_opener.scope.v2:forbidden_token:§"
              ],
              "emitted": true
            },
            {
              "key": "processing_narrative",
              "owner_kind": "template",
              "template_ids_rendered": [
                "T.risk.processing_narrative"
              ],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "activity_analytics",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "eu_persuasive_authority",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "risk_assessment_by_activity",
              "owner_kind": "template",
              "template_ids_rendered": [
                "T.risk.summary.docs",
                "T.risk.balance.firm",
                "T.risk.less_intrusive_alternatives.present"
              ],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "risk_register",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "top_risks",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "priority_actions",
              "owner_kind": "template",
              "template_ids_rendered": [
                "T.risk.priority_action.golden",
                "T.risk.priority_action.golden",
                "T.risk.priority_action.golden",
                "T.risk.priority_action.golden",
                "T.risk.priority_action.golden"
              ],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "next_steps",
              "owner_kind": "template",
              "template_ids_rendered": [
                "T.risk.next_step",
                "T.risk.next_step"
              ],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "strengthen_items",
              "owner_kind": "template",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": false,
              "omitted_reason": "no_content"
            },
            {
              "key": "inconsistency_flags",
              "owner_kind": "template-cut",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true,
              "omitted_reason": "template_cut_empty_by_design"
            },
            {
              "key": "exception_analysis",
              "owner_kind": "template",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": false,
              "omitted_reason": "no_content"
            },
            {
              "key": "record_sufficiency",
              "owner_kind": "template",
              "template_ids_rendered": [
                "T.risk.record_sufficiency.prose.v2",
                "T.risk.record_sufficiency.prose",
                "T.risk.record_sufficiency.item",
                "T.risk.record_sufficiency.item",
                "T.risk.record_sufficiency.item",
                "T.risk.record_sufficiency.item",
                "T.risk.record_sufficiency.item",
                "T.risk.record_sufficiency.item",
                "T.risk.record_sufficiency.item",
                "T.risk.record_sufficiency.item",
                "T.risk.record_sufficiency.item"
              ],
              "render_errors": [
                "T.risk.record_sufficiency.prose.v2:forbidden_token:§",
                "T.risk.record_sufficiency.prose:forbidden_token:§"
              ],
              "emitted": true
            },
            {
              "key": "information_needed",
              "owner_kind": "template",
              "template_ids_rendered": [
                "T.risk.documentation.gap"
              ],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "part_a",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "part_b",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "gating",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "annotations",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "requires_attorney_review",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "debug_review_notes",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": false,
              "omitted_reason": "manifest_absent"
            },
            {
              "key": "fsor_commentary",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": false,
              "omitted_reason": "manifest_absent"
            },
            {
              "key": "citation_ledger",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "validation_summary",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": false,
              "omitted_reason": "manifest_absent"
            },
            {
              "key": "enforcement_context",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": true
            },
            {
              "key": "enforcement_precedents",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": false,
              "omitted_reason": "no_content"
            },
            {
              "key": "enforcement_meta",
              "owner_kind": "deterministic",
              "template_ids_rendered": [],
              "render_errors": [],
              "emitted": false,
              "omitted_reason": "no_content"
            }
          ],
          "harvest_decisions": [
            {
              "guard_version": "harvest-guard@2026-07-28-tm3",
              "harvest_key": "opening_summary",
              "artifact_present": false,
              "artifact_len": 0,
              "rejection_reason": "harvest_missing_or_empty",
              "evidence": []
            },
            {
              "guard_version": "harvest-guard@2026-07-28-tm3",
              "harvest_key": "submission_summary",
              "artifact_present": true,
              "artifact_len": 3814,
              "rejection_reason": null,
              "evidence": []
            }
          ],
          "exit_checks": {
            "flat_certainty_rejections": [],
            "pii_rejections": [],
            "shipped_surface": {
              "cut_violations": [],
              "unowned_paths": [
                "methodology_note"
              ]
            },
            "shipped_value_screen": {
              "version": "shipped-value-screen@2026-07-28-item215",
              "mode": "enforce",
              "hits": [
                {
                  "kind": "truncated-slot-value",
                  "match": "A",
                  "path": "activity_analytics[0].harm_causation[0].harm_id",
                  "context": "A"
                },
                {
                  "kind": "truncated-slot-value",
                  "match": "A",
                  "path": "activity_analytics[0].safeguard_map[0].harm_id",
                  "context": "A"
                },
                {
                  "kind": "truncated-slot-value",
                  "match": "A",
                  "path": "activity_analytics[0].weighing[0].offsetting_harm_ids[0]",
                  "context": "A"
                },
                {
                  "kind": "registry-id",
                  "match": "/(^|[ ,;:])(benefit|neg|safe)[ _][a-z]/i",
                  "path": "activity_analytics[0].weighing[0].sufficiency",
                  "context": "benefit_supported"
                },
                {
                  "kind": "truncated-slot-value",
                  "match": "A",
                  "path": "activity_analytics[0].weighing[1].offsetting_harm_ids[0]",
                  "context": "A"
                },
                {
                  "kind": "registry-id",
                  "match": "/(^|[ ,;:])(benefit|neg|safe)[ _][a-z]/i",
                  "path": "activity_analytics[0].weighing[1].sufficiency",
                  "context": "benefit_supported"
                },
                {
                  "kind": "truncated-slot-value",
                  "match": "A",
                  "path": "activity_analytics[0].weighing[2].offsetting_harm_ids[0]",
                  "context": "A"
                },
                {
                  "kind": "registry-id",
                  "match": "/(^|[ ,;:])(benefit|neg|safe)[ _][a-z]/i",
                  "path": "activity_analytics[0].weighing[2].sufficiency",
                  "context": "benefit_supported"
                },
                {
                  "kind": "registry-id",
                  "match": "/(^|[ ,;:])(benefit|neg|safe)[ _][a-z]/i",
                  "path": "activity_analytics[0].weighing[3].benefit_statement",
                  "context": "No public benefit is claimed for this activity beyond the consumer benefit stated above."
                },
                {
                  "kind": "truncated-slot-value",
                  "match": "A",
                  "path": "activity_analytics[0].weighing[3].offsetting_harm_ids[0]",
                  "context": "A"
                },
                {
                  "kind": "registry-id",
                  "match": "/(^|[ ,;:])(benefit|neg|safe)[ _][a-z]/i",
                  "path": "activity_analytics[0].weighing[3].sufficiency",
                  "context": "benefit_supported"
                },
                {
                  "kind": "registry-id",
                  "match": "/\\b[rw]\\.[a-z][a-z0-9_.]*\\b/",
                  "path": "citation_ledger[0].pinpoint_ref",
                  "context": "cb.r.applicability.selling_sharing"
                },
                {
                  "kind": "registry-id",
                  "match": "/\\b[rw]\\.[a-z][a-z0-9_.]*\\b/",
                  "path": "citation_ledger[1].pinpoint_ref",
                  "context": "cb.r.applicability.sensitive_pi"
                },
                {
                  "kind": "registry-id",
                  "match": "/\\b[rw]\\.[a-z][a-z0-9_.]*\\b/",
                  "path": "citation_ledger[2].pinpoint_ref",
                  "context": "cb.r.applicability.admt_significant_decision"
                },
                {
                  "kind": "registry-id",
                  "match": "/\\b[rw]\\.[a-z][a-z0-9_.]*\\b/",
                  "path": "citation_ledger[3].pinpoint_ref",
                  "context": "cb.r.applicability.systematic_observation"
                },
                {
                  "kind": "registry-id",
                  "match": "/\\b[rw]\\.[a-z][a-z0-9_.]*\\b/",
                  "path": "citation_ledger[4].pinpoint_ref",
                  "context": "cb.r.applicability.sensitive_location"
                },
                {
                  "kind": "registry-id",
                  "match": "/\\b[rw]\\.[a-z][a-z0-9_.]*\\b/",
                  "path": "citation_ledger[5].pinpoint_ref",
                  "context": "cb.r.applicability.train_admt"
                },
                {
                  "kind": "registry-id",
                  "match": "/\\b[rw]\\.[a-z][a-z0-9_.]*\\b/",
                  "path": "citation_ledger[6].pinpoint_ref",
                  "context": "cb.r.cohort.compliance_date"
                },
                {
                  "kind": "registry-id",
                  "match": "/\\b[rw]\\.[a-z][a-z0-9_.]*\\b/",
                  "path": "citation_ledger[7].pinpoint_ref",
                  "context": "cb.r.documentation.purpose_present"
                },
                {
                  "kind": "registry-id",
                  "match": "/\\b[rw]\\.[a-z][a-z0-9_.]*\\b/",
                  "path": "citation_ledger[8].pinpoint_ref",
                  "context": "cb.r.documentation.categories_present"
                },
                {
                  "kind": "registry-id",
                  "match": "/\\b[rw]\\.[a-z][a-z0-9_.]*\\b/",
                  "path": "citation_ledger[9].pinpoint_ref",
                  "context": "cb.r.documentation.operational_elements_present"
                },
                {
                  "kind": "registry-id",
                  "match": "/\\b[rw]\\.[a-z][a-z0-9_.]*\\b/",
                  "path": "citation_ledger[10].pinpoint_ref",
                  "context": "cb.r.documentation.approver_present"
                },
                {
                  "kind": "registry-id",
                  "match": "/\\b[rw]\\.[a-z][a-z0-9_.]*\\b/",
                  "path": "citation_ledger[11].pinpoint_ref",
                  "context": "cb.r.admt.consequence_gated"
                },
                {
                  "kind": "registry-id",
                  "match": "/\\b[rw]\\.[a-z][a-z0-9_.]*\\b/",
                  "path": "citation_ledger[12].pinpoint_ref",
                  "context": "cb.w.balance.risks_vs_benefits"
                },
                {
                  "kind": "registry-id",
                  "match": "/\\bj\\.[a-z][a-z0-9_]*\\b/",
                  "path": "citation_ledger[13].pinpoint_ref",
                  "context": "cb.j.initiation_decision"
                },
                {
                  "kind": "registry-id",
                  "match": "/\\bj\\.[a-z][a-z0-9_]*\\b/",
                  "path": "citation_ledger[14].pinpoint_ref",
                  "context": "cb.j.purpose_specificity_adequacy"
                },
                {
                  "kind": "registry-id",
                  "match": "/\\bj\\.[a-z][a-z0-9_]*\\b/",
                  "path": "citation_ledger[15].pinpoint_ref",
                  "context": "cb.j.safeguard_sufficiency"
                }
              ],
              "enforce_violation": true
            },
            "shipped_coherence": {
              "mode": "enforce",
              "violations": [],
              "enforce_violation": false
            },
            "golden_shape": {
              "version": "golden-shape-quotas-cppa-risk-2026-07-28-item241-1",
              "sections": [
                {
                  "key": "executive_summary",
                  "kind": "scalar",
                  "present": true,
                  "chars": 650,
                  "items": 0,
                  "avg_chars_per_item": 0,
                  "meets_quota": true,
                  "shortfall_reasons": []
                },
                {
                  "key": "assessment_summary",
                  "kind": "narrative_bag",
                  "present": true,
                  "chars": 666,
                  "items": 0,
                  "avg_chars_per_item": 0,
                  "meets_quota": true,
                  "shortfall_reasons": []
                },
                {
                  "key": "scope_and_triggers",
                  "kind": "list",
                  "present": true,
                  "chars": 2160,
                  "items": 7,
                  "avg_chars_per_item": 309,
                  "meets_quota": true,
                  "shortfall_reasons": []
                },
                {
                  "key": "scope_confirmation",
                  "kind": "list",
                  "present": false,
                  "chars": 0,
                  "items": 0,
                  "avg_chars_per_item": 0,
                  "meets_quota": false,
                  "shortfall_reasons": [
                    "min_items:0<6"
                  ]
                },
                {
                  "key": "risk_assessment_by_activity",
                  "kind": "list",
                  "present": true,
                  "chars": 927,
                  "items": 2,
                  "avg_chars_per_item": 464,
                  "meets_quota": false,
                  "shortfall_reasons": [
                    "avg_chars_per_item:464<800"
                  ]
                },
                {
                  "key": "priority_actions",
                  "kind": "list",
                  "present": true,
                  "chars": 4464,
                  "items": 5,
                  "avg_chars_per_item": 893,
                  "meets_quota": true,
                  "shortfall_reasons": []
                },
                {
                  "key": "next_steps",
                  "kind": "list",
                  "present": true,
                  "chars": 478,
                  "items": 2,
                  "avg_chars_per_item": 239,
                  "meets_quota": true,
                  "shortfall_reasons": []
                },
                {
                  "key": "record_sufficiency",
                  "kind": "list",
                  "present": true,
                  "chars": 2347,
                  "items": 11,
                  "avg_chars_per_item": 213,
                  "meets_quota": true,
                  "shortfall_reasons": []
                },
                {
                  "key": "information_needed",
                  "kind": "list",
                  "present": true,
                  "chars": 371,
                  "items": 1,
                  "avg_chars_per_item": 371,
                  "meets_quota": true,
                  "shortfall_reasons": []
                }
              ],
              "review_flag": true,
              "shortfall_keys": [
                "scope_confirmation",
                "risk_assessment_by_activity"
              ]
            },
            "methodology_note": {
              "removed": 0,
              "note_attached": true
            },
            "citation_lint": {
              "ran": false,
              "reason": "no citation supply provided"
            }
          },
          "structural_completeness": {
            "rows": [
              {
                "key": "schema_version",
                "expected": "always",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "document_metadata",
                "expected": "always",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "attestation_block",
                "expected": "always",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "disclaimer",
                "expected": "always",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "framework_disclaimer",
                "expected": "always",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "accuracy_caveat",
                "expected": "always",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "domains",
                "expected": "always",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "_meta",
                "expected": "always",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "overall_score",
                "expected": "always",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "risk_level",
                "expected": "always",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "opening_summary",
                "expected": "conditional",
                "emitted": false,
                "conformant": true
              },
              {
                "key": "submission_summary",
                "expected": "conditional",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "executive_summary",
                "expected": "conditional",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "assessment_summary",
                "expected": "conditional",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "scope_and_triggers",
                "expected": "conditional",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "processing_narrative",
                "expected": "conditional",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "activity_analytics",
                "expected": "always",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "eu_persuasive_authority",
                "expected": "always",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "risk_assessment_by_activity",
                "expected": "conditional",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "risk_register",
                "expected": "conditional",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "top_risks",
                "expected": "conditional",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "priority_actions",
                "expected": "conditional",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "next_steps",
                "expected": "conditional",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "strengthen_items",
                "expected": "conditional",
                "emitted": false,
                "conformant": true
              },
              {
                "key": "inconsistency_flags",
                "expected": "template-cut",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "exception_analysis",
                "expected": "conditional",
                "emitted": false,
                "conformant": true
              },
              {
                "key": "record_sufficiency",
                "expected": "conditional",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "information_needed",
                "expected": "conditional",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "part_a",
                "expected": "empty-by-design",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "part_b",
                "expected": "empty-by-design",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "gating",
                "expected": "empty-by-design",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "annotations",
                "expected": "conditional",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "requires_attorney_review",
                "expected": "conditional",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "debug_review_notes",
                "expected": "manifest-gated",
                "emitted": false,
                "conformant": true
              },
              {
                "key": "fsor_commentary",
                "expected": "manifest-gated",
                "emitted": false,
                "conformant": true
              },
              {
                "key": "citation_ledger",
                "expected": "conditional",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "validation_summary",
                "expected": "manifest-gated",
                "emitted": false,
                "conformant": true
              },
              {
                "key": "enforcement_context",
                "expected": "always",
                "emitted": true,
                "conformant": true
              },
              {
                "key": "enforcement_precedents",
                "expected": "empty-by-design",
                "emitted": false,
                "conformant": true
              },
              {
                "key": "enforcement_meta",
                "expected": "empty-by-design",
                "emitted": false,
                "conformant": true
              }
            ],
            "nonconformant_keys": [],
            "ok": true
          },
          "composition_shape": {
            "version": "cppa-risk-shape@2026-07-28-tm7-retirement",
            "product": "cppa-risk-assessment",
            "final_documents_per_assessment": 1,
            "llm_calls_per_document": [
              {
                "stage": "pass1_derive",
                "role": "authoritative RenderPlan derive",
                "model_role": "pass1_derive"
              }
            ],
            "intermediate_artifacts": [
              "render_plan (authoritative)",
              "assembler_output (shipped body; harvests are deterministic)"
            ],
            "note": "CEO ruling 2026-07-28: undeclared drift aborts; declared shape is the conformance target."
          },
          "total_sections": 40,
          "emitted_sections": 32,
          "omitted_sections": 8
        },
        "intake_era_normalization": {
          "version": "era-normalize@2026-07-30-item269",
          "applied": false,
          "mapped_keys": 0,
          "mapped_key_names": [],
          "unmapped_legacy_keys": [],
          "band_labels_resolved": []
        },
        "type_j_origin": null,
        "shipped_surface": "deterministic",
        "pass2r_skipped_reason": "pass2r_not_run_yet",
        "pass2r_attempt_rejections": [],
        "pass2r_prose_rejected": false,
        "emit_gate_filtered": 0
      }
    }
  },
  "overall_score": null,
  "risk_level": "Low",
  "submission_summary": "[§ 7157 submission / § 7155 retention] Under 11 CCR § 7157(a)(1), for risk assessments conducted in 2026 and 2027, a business must submit to the Agency the information required by § 7157(b) no later than April 1, 2028. Under § 7157(a)(2), for risk assessments conducted after 2027, that information is due no later than April 1 following any year during which the business conducted the risk assessments — for assessments conducted in 2028, no later than April 1, 2029. Under § 7155(c), a business must retain its risk assessments, including original and updated versions, for as long as the processing continues or for five years after the completion of the risk assessment, whichever is later. Under § 7155(a)(2)-(3), at least once every three years a business must review, and update as necessary, its risk assessments; and notwithstanding that cadence, it must update a risk assessment whenever there is a material change relating to the processing activity, as soon as feasibly possible but no later than 45 calendar days from the date of the material change. A change is material if it creates new negative impacts, increases the magnitude or likelihood of previously identified negative impacts under § 7152(a)(5), or diminishes the effectiveness of the safeguards under § 7152(a)(6). The customer, in consultation with qualified legal counsel, determines the submission window that applies to this assessment and calendars the corresponding review and update dates.\n\nSeparately, the cybersecurity-audit obligation under 11 CCR § 7121(a) phases in as follows:\n\n[§ 7121(a) phase-in schedule] Under 11 CCR § 7121(a), a business must complete its first cybersecurity audit report no later than one of three cohort deadlines fixed by the regulation: — Per § 7121(a)(1), April 1, 2028, if the business's annual gross revenue for 2026 was more than one hundred million dollars ($100,000,000) as of January 1, 2027; the audit would cover the period from January 1, 2027, through January 1, 2028. — Per § 7121(a)(2), April 1, 2029, if the business's annual gross revenue for 2027 was between fifty million dollars ($50,000,000) and one hundred million dollars ($100,000,000) as of January 1, 2028; the audit would cover the period from January 1, 2028, through January 1, 2029. — Per § 7121(a)(3), April 1, 2030, if the business's annual gross revenue for 2028 was less than fifty million dollars ($50,000,000); the audit would cover the period from January 1, 2029, through January 1, 2030. The customer, in consultation with qualified legal counsel, determines which tier its revenue places it in and calendars the corresponding deadline.\n\n[§ 7121(a) cohort on the recorded band] On the recorded annual gross revenue band ($25M to under $50M), the § 7121(a)(3) cohort deadline is April 1, 2030, covering the audit period January 1, 2029, through January 1, 2030. The customer, in consultation with qualified legal counsel, confirms this cohort against its final revenue figures.\n\nSubmission postures under 11 CCR § 7120(b):\n\n§ 7120(b)(1) incorporates Civil Code § 1798.140(d)(1)(C), which applies when a business \"Derives 50 percent or more of its annual revenues from selling or sharing consumers’ personal information\". On the current record this threshold is not met.\n\n§ 7120(b)(2)(A) applies when a business \"Processed the personal information of 250,000 or more consumers or households in the preceding calendar year\". The current record provides insufficient basis to resolve this threshold as met or not met; completing the underlying intake field resolves it.\n\n§ 7120(b)(2)(B) applies when a business \"Processed the sensitive personal information of 50,000 or more consumers in the preceding calendar year\". On the current record this prong is not applicable; there is insufficient basis to apply it here.",
  "executive_summary": "The activity assessed in this Risk Assessment is Free-tier account analytics, undertaken for the purpose of we analyse free-tier account and device identifiers to measure product usage. The analysis that follows — scope, processing, benefits, negative impacts, safeguards, and the weighing conclusion — is directed to that activity.\n\nOn the record as documented, one activity requiring assessment were assessed for this Risk Assessment. For this activity, the benefits identified outweigh the negative impacts, subject to the safeguards described. The sufficiency of those safeguards and the decision to proceed rest with the Company and its counsel.",
  "assessment_summary": {
    "narrative": "Weighing the benefits identified in the record — benefits to the business, Benefits to the consumer, Benefits to other stakeholders, and Benefits to the public — against the potential negative impacts — unauthorized access, destruction, use, modification, or disclosure and Impairing consumers' control over their personal information — and taking into account the safeguards described — technical / architectural controls — the record supports the conclusion that the benefits, as documented, outweigh the identified negative impacts under the framework of 11 CCR § 7152(a).\n\nThe assessment record is complete against the documentation elements of 11 CCR § 7152(a)."
  },
  "scope_and_triggers": [
    "**Scope & Triggers.** This assessment is triggered under **11 CCR § 7150(b)(4) — using automated processing based on systematic observation in worker, student, or applicant contexts** on the following record basis: the record affirms conduct falling within § 7150(b)(4), which reads: \"Using automated processing to infer or extrapolate a consumer’s intelligence, ability, aptitude, performance at work, economic situation, health (including mental health), personal preferences, interests, reliability, predispositions, behavior, location, or movements, based upon systematic observation of that consumer when they are acting in their capacity as an educational program applicant, job applicant, student, employee, or independent contractor for the business.\". The remaining § 7150(b) applicability prongs are not engaged on the current record: selling or sharing personal information (11 CCR § 7150(b)(1)); processing sensitive personal information (11 CCR § 7150(b)(2)); using ADMT for a significant decision concerning a consumer (11 CCR § 7150(b)(3)); using automated processing based on a consumer’s presence in a sensitive location (11 CCR § 7150(b)(5)); processing personal information to train an ADMT or biometric-recognition technology (11 CCR § 7150(b)(6)).",
    "Engaged — 11 CCR § 7150(b)(4) (inferring characteristics from systematic observation of workers, students, or applicants): the record supports this trigger and this activity falls within the risk-assessment obligation.",
    "Not engaged — 11 CCR § 7150(b)(1) (selling or sharing personal information): the record does not support this trigger.",
    "Not engaged — 11 CCR § 7150(b)(2) (processing sensitive personal information): the record does not support this trigger.",
    "Not engaged — 11 CCR § 7150(b)(3) (using ADMT for a significant decision concerning a consumer): the record does not support this trigger.",
    "Not engaged — 11 CCR § 7150(b)(5) (inferring characteristics from presence at a sensitive location): the record does not support this trigger.",
    "Not engaged — 11 CCR § 7150(b)(6) (processing personal information to train an ADMT or identification technology): the record does not support this trigger."
  ],
  "processing_narrative": [
    "**How Meridian SaaS Inc processes personal information for Free-tier account analytics.**\n\nMeridian SaaS Inc collects Contact identifiers (name, email, phone) and Device identifiers (IP, cookies, device IDs) from account signup and product telemetry. The information is used deliver core SaaS analytics functionality to enterprise customers with role-based access controls in place. Meridian SaaS Inc discloses this information to AWS (hosting), Stripe (billing), SendGrid (email) through Notice at Collection and Privacy policy. The record sets a retention period of 24 months rolling, applying the criterion that fixed period from collection. At the end of that period the information is handled under the record's stated deletion process: Automated deletion with confirmation."
  ],
  "activity_analytics": [
    {
      "activity_id": "act.free-tier-account-analytics",
      "activity_name": "Free-tier account analytics",
      "activity_purpose": "We analyse free-tier account and device identifiers to measure product usage.",
      "is_primary": true,
      "necessity_analysis": [
        {
          "element": "Account email address",
          "asserted_status": "Necessary to the stated purpose",
          "verdict": "supported_as_necessary",
          "justification": "The email address is the account identifier used to authenticate the free-tier session that the usage measurement is attributed to; without it no measurement can be tied to an account.",
          "citation": "11 CCR § 7152(a)(2)",
          "status": "analysed"
        },
        {
          "element": "Device identifier (cookie ID)",
          "asserted_status": "Necessary to the stated purpose",
          "verdict": "supported_as_necessary",
          "justification": "The cookie ID distinguishes repeat sessions from first sessions, which is the measurement the activity exists to produce.",
          "citation": "11 CCR § 7152(a)(2)",
          "status": "analysed"
        },
        {
          "element": "Approximate location derived from IP address",
          "asserted_status": "Collected but not necessary to the stated purpose",
          "verdict": "minimisation_candidate",
          "justification": "Location is captured by the telemetry SDK's defaults and is not used in any usage-measurement output.",
          "citation": "11 CCR § 7152(a)(2)",
          "status": "analysed"
        }
      ],
      "harm_causation": [
        {
          "harm_id": "A",
          "harm_pinpoint": "11 CCR § 7152(a)(5)(A)",
          "harm_label": "Unauthorized access, destruction, use, modification, or disclosure; loss of availability",
          "harm_verbatim": "Unauthorized access, destruction, use, modification, or disclosure of personal information; and unauthorized activity resulting in the loss of availability of personal information.",
          "source": "The telemetry event store, which holds account email addresses joined to device identifiers, is readable by the analytics service account.",
          "cause": "An over-broad analytics service-account credential could be reused outside the measurement pipeline and export the joined table.",
          "likelihood": "Unlikely",
          "severity": "Moderate",
          "inherent_band": "low",
          "status": "analysed"
        },
        {
          "harm_id": "C",
          "harm_pinpoint": "11 CCR § 7152(a)(5)(C)",
          "harm_label": "Impairment of consumer control over personal information",
          "harm_verbatim": "Impairing consumers’ control over their personal information, such as by providing insufficient information for consumers to make an informed decision regarding the processing of their personal information, or by interfering with consumers’ ability to make choices consistent with their reasonable expectations.",
          "source": "The free-tier signup notice describes telemetry collection but does not name the derived approximate-location field.",
          "cause": "A consumer reading the notice cannot tell that IP-derived location is retained, so the opt-out choice is made on an incomplete description.",
          "likelihood": "Possible",
          "severity": "Minimal",
          "inherent_band": "low",
          "status": "analysed"
        }
      ],
      "safeguard_map": [
        {
          "harm_id": "A",
          "safeguard": "The analytics service account is scoped to the measurement views only, credentials rotate every 30 days, and exports are logged and reviewed weekly.",
          "safeguard_status": "Implemented and tested",
          "residual_band": "low",
          "citation": "11 CCR § 7152(a)(6)",
          "status": "analysed"
        },
        {
          "harm_id": "C",
          "safeguard": "The notice at collection is being amended to name IP-derived approximate location and the telemetry SDK default is being disabled.",
          "safeguard_status": "Implemented and tested",
          "residual_band": "low",
          "citation": "11 CCR § 7152(a)(6)",
          "status": "analysed"
        }
      ],
      "weighing": [
        {
          "beneficiary_class": "the business",
          "benefit_statement": "Free-tier usage measurement tells the engineering team which onboarding step free-tier accounts abandon, which is the input to the quarterly onboarding rework decision.",
          "generic_benefit_flag": false,
          "offsetting_harm_ids": [
            "A",
            "C"
          ],
          "sufficiency": "benefit_supported",
          "citation": "11 CCR § 7152(a)(4)",
          "status": "analysed"
        },
        {
          "beneficiary_class": "the consumer",
          "benefit_statement": "Consumers reach a working configuration faster because the abandoned onboarding steps identified by this measurement are the ones rewritten first.",
          "generic_benefit_flag": false,
          "offsetting_harm_ids": [
            "A",
            "C"
          ],
          "sufficiency": "benefit_supported",
          "citation": "11 CCR § 7152(a)(4)",
          "status": "analysed"
        },
        {
          "beneficiary_class": "other stakeholders",
          "benefit_statement": "Enterprise administrators who sponsor free-tier trials receive accurate seat-activation reporting instead of estimates when deciding whether to convert a trial.",
          "generic_benefit_flag": false,
          "offsetting_harm_ids": [
            "A",
            "C"
          ],
          "sufficiency": "benefit_supported",
          "citation": "11 CCR § 7152(a)(4)",
          "status": "analysed"
        },
        {
          "beneficiary_class": "the public",
          "benefit_statement": "No public benefit is claimed for this activity beyond the consumer benefit stated above.",
          "generic_benefit_flag": false,
          "offsetting_harm_ids": [
            "A",
            "C"
          ],
          "sufficiency": "benefit_supported",
          "citation": "11 CCR § 7152(a)(4)",
          "status": "analysed"
        }
      ],
      "consequence": {
        "decision": "initiate_with_conditions",
        "rule_ids": [
          "C3b"
        ],
        "reasons": [
          "At least one personal-information element is recorded as collected but not necessary to the stated purpose."
        ],
        "conditions": [
          "Cease or justify collection of Approximate location derived from IP address, recorded as not necessary to the stated purpose (§ 7152(a)(2))."
        ],
        "citation": "11 CCR § 7152(a)(7)",
        "approver_name": "Priya Raman",
        "approver_position": "General Counsel",
        "approval_date": "2026-07-30",
        "approval_recorded": true,
        "status": "analysed"
      }
    }
  ],
  "eu_persuasive_authority": {
    "section_title": "Persuasive authority from EU practice",
    "version": "cppa-risk-eu-authority-2026-08-01-item341",
    "status": "no_qualifying_authority",
    "framing": {
      "regime_label": "European Union / EEA data-protection practice — a different legal regime from the California Consumer Privacy Act and the CPPA regulations.",
      "persuasive_note": "The material in this section is offered as persuasive authority only. It is not binding on the Company, on the California Privacy Protection Agency, or on any California court, and it does not establish a CPPA requirement.",
      "weight_reservation": "The weight to be given to any item below is reserved to the Company and its counsel. Nothing in this section directs a course of action.",
      "carve_out_note": "The directive carve-out at 11 CCR § 7156(a) applies to the California analysis and does not extend to this section."
    },
    "topics": [],
    "information_needed": "The EU/EEA authority corpus was not available when this document was built. No persuasive material is stated, because stating any would mean quoting from memory rather than from the corpus."
  },
  "risk_assessment_by_activity": [
    "The assessment record is complete against the documentation elements of 11 CCR § 7152(a). Weighing the benefits identified in the record — benefits to the business, Benefits to the consumer, Benefits to other stakeholders, and Benefits to the public — against the potential negative impacts — unauthorized access, destruction, use, modification, or disclosure and Impairing consumers' control over their personal information — and taking into account the safeguards described — technical / architectural controls — the record supports the conclusion that the benefits, as documented, outweigh the identified negative impacts under the framework of 11 CCR § 7152(a).",
    "The record states that Meridian SaaS Inc considered less-intrusive alternatives as follows: we collect only identifiers necessary to provision accounts and bill customers. Under 11 CCR § 7152(a)(2), this record is the operative statement for the balancing frame."
  ],
  "risk_register": [
    {
      "title": "Unauthorized access, destruction, use, modification, or disclosure",
      "description": "Unauthorized access, destruction, use, modification, or disclosure is documented on the assessment record.",
      "citation": "11 CCR § 7152(a)(5)(A)",
      "status": "Documented on the record"
    },
    {
      "title": "Discrimination on protected characteristics",
      "description": "Discrimination on protected characteristics is not documented on the assessment record.",
      "citation": "11 CCR § 7152(a)(5)(B)",
      "status": "Not present in the record as documented"
    },
    {
      "title": "Impairing consumers' control over their personal information",
      "description": "Impairing consumers' control over their personal information is documented on the assessment record.",
      "citation": "11 CCR § 7152(a)(5)(C)",
      "status": "Documented on the record"
    },
    {
      "title": "Coercion or compulsion (including dark patterns)",
      "description": "Coercion or compulsion (including dark patterns) is not documented on the assessment record.",
      "citation": "11 CCR § 7152(a)(5)(D)",
      "status": "Not present in the record as documented"
    },
    {
      "title": "Economic harms",
      "description": "Economic harms is not documented on the assessment record.",
      "citation": "11 CCR § 7152(a)(5)(E)",
      "status": "Not present in the record as documented"
    },
    {
      "title": "Physical harms",
      "description": "Physical harms is not documented on the assessment record.",
      "citation": "11 CCR § 7152(a)(5)(F)",
      "status": "Not present in the record as documented"
    },
    {
      "title": "Reputational harms",
      "description": "Reputational harms is not documented on the assessment record.",
      "citation": "11 CCR § 7152(a)(5)(G)",
      "status": "Not present in the record as documented"
    },
    {
      "title": "Psychological harms",
      "description": "Psychological harms is not documented on the assessment record.",
      "citation": "11 CCR § 7152(a)(5)(H)",
      "status": "Not present in the record as documented"
    }
  ],
  "top_risks": [
    {
      "title": "Unauthorized access, destruction, use, modification, or disclosure",
      "description": "Unauthorized access, destruction, use, modification, or disclosure is documented on the assessment record.",
      "citation": "11 CCR § 7152(a)(5)(A)",
      "status": "Documented on the record"
    },
    {
      "title": "Impairing consumers' control over their personal information",
      "description": "Impairing consumers' control over their personal information is documented on the assessment record.",
      "citation": "11 CCR § 7152(a)(5)(C)",
      "status": "Documented on the record"
    },
    {
      "title": "Discrimination on protected characteristics",
      "description": "Discrimination on protected characteristics is not documented on the assessment record.",
      "citation": "11 CCR § 7152(a)(5)(B)",
      "status": "Not present in the record as documented"
    },
    {
      "title": "Coercion or compulsion (including dark patterns)",
      "description": "Coercion or compulsion (including dark patterns) is not documented on the assessment record.",
      "citation": "11 CCR § 7152(a)(5)(D)",
      "status": "Not present in the record as documented"
    },
    {
      "title": "Economic harms",
      "description": "Economic harms is not documented on the assessment record.",
      "citation": "11 CCR § 7152(a)(5)(E)",
      "status": "Not present in the record as documented"
    },
    {
      "title": "Physical harms",
      "description": "Physical harms is not documented on the assessment record.",
      "citation": "11 CCR § 7152(a)(5)(F)",
      "status": "Not present in the record as documented"
    },
    {
      "title": "Reputational harms",
      "description": "Reputational harms is not documented on the assessment record.",
      "citation": "11 CCR § 7152(a)(5)(G)",
      "status": "Not present in the record as documented"
    },
    {
      "title": "Psychological harms",
      "description": "Psychological harms is not documented on the assessment record.",
      "citation": "11 CCR § 7152(a)(5)(H)",
      "status": "Not present in the record as documented"
    }
  ],
  "priority_actions": [
    "**qualified counsel should be consulted for further consideration of decision whether to initiate the processing** — 11 CCR § 7152(a)(7). On Meridian SaaS Inc's record, the record reserves decision whether to initiate the processing to the accountable business owner. The gap is the reserved judgment must be exercised and recorded before the assessment closes. The regulation requires the following: the business must record a reasoned initiation decision — proceed, proceed with modifications, or do not initiate — attaching the decision to the specific balancing outcome, naming the decisionmaker and the date of decision, and, when proceeding with modifications, listing each modification and the risk it addresses complete and retain the assessment record by December 31, 2027, the compliance date fixed by 11 CCR § 7155(b) for processing that was underway before the operative date; this is an ongoing obligation Owner: Chief Privacy Officer.",
    "**qualified counsel should be consulted for further consideration of adequacy of the processing purpose statement** — 11 CCR § 7152(a)(1). On Meridian SaaS Inc's record, the record reserves adequacy of the processing purpose statement to qualified legal counsel. The gap is the reserved judgment must be exercised and recorded before the assessment closes. The regulation requires the following: counsel must record a reasoned adequacy determination on the stated operational purpose, attaching the determination to the exact purpose language in the record, and identifying any narrowing required for the purpose to satisfy § 7152(a)(1) specificity complete and retain the assessment record by December 31, 2027, the compliance date fixed by 11 CCR § 7155(b) for processing that was underway before the operative date; this is an ongoing obligation Owner: qualified legal counsel.",
    "**qualified counsel should be consulted for further consideration of sufficiency of the safeguards** — 11 CCR § 7152(a)(6). On Meridian SaaS Inc's record, the record reserves sufficiency of the safeguards to qualified legal counsel. The gap is the reserved judgment must be exercised and recorded before the assessment closes. The regulation requires the following: counsel must record a reasoned sufficiency determination on the safeguards documented, attaching the determination to the specific safeguards enumerated in the record, and identifying any safeguard gap the balancing outcome must weigh under § 7152(a)(6) complete and retain the assessment record by December 31, 2027, the compliance date fixed by 11 CCR § 7155(b) for processing that was underway before the operative date; this is an ongoing obligation Owner: qualified legal counsel.",
    "**additional information would be needed for the following potential negative impact categories:\n• Discrimination on protected characteristics\n• Coercion or compulsion (including dark patterns)\n• Economic harms\n• Physical harms\n• Reputational harms\n• Psychological harms** — 11 CCR § 7152(a)(5). On Meridian SaaS Inc's record, none of the listed items above are on Meridian SaaS Inc.'s record. The gap is 11 CCR § 7152(a)(5) requires each of these elements to be documented for the assessment record to be complete. The regulation requires the following: document each of the listed § 7152(a)(5) negative-impact categories on the assessment record with the specificity the subsection requires complete and retain the assessment record by December 31, 2027, the compliance date fixed by 11 CCR § 7155(b) for processing that was underway before the operative date; this is an ongoing obligation Owner: Privacy Officer, Head of Engineering, Data Platform Lead.",
    "**additional information would be needed for the following safeguards:\n• Privacy-enhancing technologies\n• External consultation / knowledge of emergent risks** — 11 CCR § 7152(a)(6). On Meridian SaaS Inc's record, none of the listed items above are on Meridian SaaS Inc.'s record. The gap is 11 CCR § 7152(a)(6) requires each of these elements to be documented for the assessment record to be complete. The regulation requires the following: document each of the listed § 7152(a)(6) safeguards on the assessment record with the specificity the subsection requires complete and retain the assessment record by December 31, 2027, the compliance date fixed by 11 CCR § 7155(b) for processing that was underway before the operative date; this is an ongoing obligation Owner: Privacy Officer, Head of Engineering, Data Platform Lead."
  ],
  "next_steps": [
    "Complete the assessment record for decision whether to initiate the processing — this element is a determination reserved to the business under the regulation rather than a gap in the assessment record. Please record decision whether to initiate the processing, the decisionmaker, and the date of the decision.",
    "Confirm Technical / architectural controls is documented in the assessment record — present on the record; retain the supporting documentation with the assessment file."
  ],
  "inconsistency_flags": [],
  "record_sufficiency": [
    "The record is sufficient for the § 7152(a)(6) balancing frame to weigh. Meridian SaaS Inc has adequately documented 7 of the § 7152(a) elements listed below; 1 of these elements remain enumerated for your review. Each element is stated once, with its § 7152(a) pinpoint, in the order the record was assessed.",
    "The record supporting this assessment is sufficient for the § 7152(a)(6) balancing frame to weigh. Meridian SaaS Inc has documented the four factual elements § 7152(a) requires — the § 7152(a)(1) processing purpose, the § 7152(a)(2) categories of personal information, the § 7152(a)(3) operational elements, and the § 7152(a)(9) authorised approver — and has recorded reserved judgments for decision whether to initiate the processing, Adequacy of the processing purpose statement, and Sufficiency of the safeguards, each attached to the specific record element the judgment governs. Reserved judgments are decisions the regulation reserves to the business and its qualified counsel under 11 CCR § 7152(a)(7), 11 CCR § 7152(a)(1), and 11 CCR § 7152(a)(6); they are not gaps in the record and do not diminish record sufficiency. Where a factual element is absent, the deficiency is enumerated in the safeguard-gaps section with its own pinpoint. As of 2026-08-02, the record is sufficient for the § 7152(a)(6) balancing frame to weigh.",
    "Benefits to the business: present in the record as documented (11 CCR § 7152(a)(4)).",
    "Benefits to the consumer: present in the record as documented (11 CCR § 7152(a)(4)).",
    "Benefits to other stakeholders: present in the record as documented (11 CCR § 7152(a)(4)).",
    "Benefits to the public: present in the record as documented (11 CCR § 7152(a)(4)).",
    "Unauthorized access, destruction, use, modification, or disclosure: present in the record as documented (11 CCR § 7152(a)(5)(A)).",
    "Impairing consumers' control over their personal information: present in the record as documented (11 CCR § 7152(a)(5)(C)).",
    "Technical / architectural controls: present in the record as documented (11 CCR § 7152(a)(6)(A)(i)).",
    "ADMT governance policies and training: not applicable — automated decisionmaking technology is not in use per the record (11 CCR § 7152(a)(6)(A)(iv)).",
    "Decision whether to initiate the processing: reserved to you for decision under the regulation; not a deficiency in the record as documented (11 CCR § 7152(a)(7))."
  ],
  "information_needed": [
    "The record does not yet include decision whether to initiate the processing, which 11 CCR § 7152(a)(7) requires. To complete this assessment: this element is a determination reserved to the business under the regulation rather than a gap in the assessment record. Please record decision whether to initiate the processing, the decisionmaker, and the date of the decision."
  ],
  "part_a": {},
  "part_b": {},
  "gating": {},
  "annotations": [
    {
      "title": "Decision whether to initiate the processing",
      "citation": "11 CCR § 7152(a)(7)"
    },
    {
      "title": "Adequacy of the processing purpose statement",
      "citation": "11 CCR § 7152(a)(1)"
    },
    {
      "title": "Sufficiency of the safeguards",
      "citation": "11 CCR § 7152(a)(6)"
    }
  ],
  "requires_attorney_review": true,
  "citation_ledger": [
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {},
    {}
  ],
  "enforcement_context": "No CPPA enforcement precedents are verified in the corpus at the time of this assessment. Enforcement context will be added when precedent rows are ingested and 40-character verbatim substring verified.",
  "methodology_note": "Methodology: each element in this report is drawn from the assessment record supplied by the business. Where the record is silent, the report says so and names the missing input rather than inferring an answer. Statutory text is quoted verbatim from the pinned regulatory corpus."
}