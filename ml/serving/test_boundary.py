import unittest

from ml.serving.boundary import build_results, result_from_probabilities, validate_label_mapping


class ClassifierBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.mapping = validate_label_mapping(
            {0: "insufficient", 1: "supports", 2: "contradicts"},
            num_labels=3,
        )

    def test_result_contains_only_classifier_fields(self):
        result = result_from_probabilities([0.1, 0.8, 0.1], self.mapping)

        self.assertEqual(
            result,
            {
                "label": "supports",
                "confidence": 0.8,
                "abstained": False,
                "model_version": "paperdiff-verifier-v1",
            },
        )
        self.assertNotIn("product_state", result)
        self.assertNotIn("probs", result)

    def test_batch_order_is_preserved(self):
        results = build_results(
            [[0.7, 0.2, 0.1], [0.1, 0.2, 0.7], [0.1, 0.7, 0.2]],
            self.mapping,
        )

        self.assertEqual(
            [result["label"] for result in results],
            ["insufficient", "contradicts", "supports"],
        )

    def test_mapping_order_comes_from_the_artifact(self):
        mapping = validate_label_mapping(
            {0: "supports", 1: "contradicts", 2: "insufficient"},
            num_labels=3,
        )

        self.assertEqual(result_from_probabilities([0.9, 0.05, 0.05], mapping)["label"], "supports")

    def test_invalid_mapping_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "supports, contradicts, and insufficient"):
            validate_label_mapping({0: "supports", 1: "contradicts", 2: "other"}, num_labels=3)


if __name__ == "__main__":
    unittest.main()
