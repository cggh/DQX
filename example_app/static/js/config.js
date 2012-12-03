define(
    function () {
        return {
            chromosomes: [
                { name: 'Pf3D7_01', len: 0.7 },
                { name: 'Pf3D7_02', len: 1 },
                { name: 'Pf3D7_03', len: 1 },
                { name: 'Pf3D7_04', len: 2 },
                { name: 'Pf3D7_05', len: 2 },
                { name: 'Pf3D7_06', len: 2 },
                { name: 'Pf3D7_07', len: 2 },
                { name: 'Pf3D7_08', len: 2 },
                { name: 'Pf3D7_09', len: 2 },
                { name: 'Pf3D7_10', len: 2 },
                { name: 'Pf3D7_11', len: 4 },
                { name: 'Pf3D7_12', len: 4 },
                { name: 'Pf3D7_13', len: 4 },
                { name: 'Pf3D7_14', len: 4 }
            ],
            samples: ["ERR012788","ERR012840","ERR012891","ERR012892","ERR012893","ERR012894","ERR012895","ERR015446","ERR015447","ERR015448","ERR015449","ERR015450","ERR015451","ERR015452","ERR015453","ERR015454","ERR015455","ERR015456","ERR015457","ERR015458","ERR015459","ERR019042","ERR019043","ERR019044","ERR019045","ERR019046","ERR019047","ERR019048","ERR019049","ERR019050","ERR019051","ERR019052","ERR019053","ERR019054","ERR019055","ERR019056","ERR019057","ERR019058","ERR019059","ERR019060","ERR019061","ERR019062","ERR019063","ERR019064","ERR019065","ERR019066","ERR019067","ERR019068","ERR019069","ERR019070","ERR019071","ERR019072","ERR019073","ERR019074","ERR019075","ERR022939","ERR022940","ERR023673","ERR023675","ERR023683","ERR027099","ERR027100","ERR027101","ERR027102","ERR027103","ERR027104","ERR027105","ERR027106","ERR027107","ERR027108","ERR027109","ERR027110","ERR027111","ERR027112","ERR027116","ERR027117","ERR029090","ERR029091","ERR029092","ERR029093","ERR029105","ERR029143","ERR029144","ERR029145","ERR029146","ERR029147","ERR029148","ERR029404","ERR029405","ERR029406","ERR029407","ERR029408","ERR029409","ERR029410","ERR029956","ERR037703","ERR037704","ERR045625","ERR045626","ERR045627","ERR045628","ERR045629","ERR045630","ERR045631","ERR045632","ERR045633","ERR045634","ERR045635","ERR045636","ERR045637","ERR045638","ERR045639","ERR045640","ERR045641","ERR045642","ERR045643","ERR045644","ERR045645","ERR045646","ERR045647","ERR107474","ERR107475","ERR107476","ERR126027"],

            tracks: {'Coverage':[
                {'range': [0, 1000], 'name': 'Number of reads', 'short_name': 'num_reads'},
                {'range': [0, 50], 'name': 'Normalised coverage', 'short_name': 'normed_coverage'},
                {'range': [0, 100], 'name': 'Percent of reads on forward strand', 'short_name': 'reads_fwd'},
                {'range': [0, 100], 'name': 'Percent of reads properly paired', 'short_name': 'reads_paired'},
                {'range': [0, 100], 'name': 'Percent of reads with mate unmapped', 'short_name': 'singletons'},
                {'range': [0, 100], 'name': 'Percent of reads with mate mapped to another chomosome', 'short_name': 'mate_other_chrom'},
                {'range': [0, 100], 'name': 'Percent of reads where mate is mapped to the same strand', 'short_name': 'mate_same_strand'},
                {'range': [0, 100], 'name': 'Percent of reads faceaway', 'short_name': 'faceaway'},
                {'range': [0, 100], 'name': 'Percent of reads softclipped', 'short_name': 'softclipped'},
                {'range': [0, 100], 'name': 'Percent of reads with edit distance zero', 'short_name': 'edit_dist_zero'}
            ],

                'Mapping Quality':[
                    {'range': [0, 60], 'name': 'RMS mapping quality', 'short_name': 'rms_mapq'},
                    {'range': [0, 100], 'name': 'Percent zero mapping quality', 'short_name': 'reads_mapq0'}
                ],

                'Template Length':[
                    {'range': [0, 50000], 'name': 'RMS template length', 'short_name': 'rms_tlen'},
                    {'range': [0, 2000000], 'name': 'Standard deviation of template length', 'short_name': 'std_tlen'}
                ],

                'Variations':[
                    {'range': [0, 100], 'name': 'Percent mismatches', 'short_name': 'mismatches'},
                    {'range': [0, 100], 'name': 'Percent mismatches properly paired on forward strand', 'short_name': 'mismatches_pp_fwd'},
                    {'range': [0, 100], 'name': 'Percent mismatches properly paired on reverse strand', 'short_name': 'mismatches_pp_rev'},
                    {'range': [0, 100], 'name': 'Percent deletions', 'short_name': 'deletions'},
                    {'range': [0, 100], 'name': 'Percent deletions properly paired on reverse strand', 'short_name': 'deletions_pp_rev'},
                    {'range': [0, 100], 'name': 'Percent deletions properly paired on forward strand', 'short_name': 'deletions_pp_fwd'},
                    {'range': [0, 100], 'name': 'Percent insertions', 'short_name': 'insertions'},
                    {'range': [0, 100], 'name': 'Percent insertions properly paired on forward strand', 'short_name': 'insertions_pp_fwd'},
                    {'range': [0, 100], 'name': 'Percent insertions properly paired on reverse strand', 'short_name': 'insertions_pp_rev'}
                ],

                'Base Quality':[
                    {'range': [0, 60], 'name': 'RMS base quality', 'short_name': 'rms_baseq'},
                    {'range': [0, 60], 'name': 'RMS forward base quality', 'short_name': 'rms_baseq_pp_fwd'},
                    {'range': [0, 60], 'name': 'RMS reverse base quality', 'short_name': 'rms_baseq_pp_rev'},
                    {'range': [0, 60], 'name': 'RMS matches base quality', 'short_name': 'rms_baseq_matches'},
                    {'range': [0, 60], 'name': 'RMS mismatches base quality', 'short_name': 'rms_baseq_mismatches'}
                ]
            }

        };
    }
);