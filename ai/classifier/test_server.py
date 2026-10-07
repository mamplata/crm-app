import unittest

from server import validate_lead, validate_result


class ClassifierValidationTest(unittest.TestCase):
    def test_valid_result_is_reduced_to_schema(self):
        result = validate_result({
            'intent': 'product_demo',
            'priority': 'HIGH',
            'industry': 'SAAS',
            'summary': 'Wants a CRM demo.',
            'confidence': 0.9,
            'ignored': True,
        })
        self.assertEqual(set(result), {'intent', 'priority', 'industry', 'summary', 'confidence'})

    def test_invalid_priority_is_rejected(self):
        with self.assertRaises(ValueError):
            validate_result({'intent': 'demo', 'priority': 'URGENT', 'industry': 'OTHER', 'summary': 'x', 'confidence': 0.5})

    def test_lead_requires_message(self):
        with self.assertRaises(ValueError):
            validate_lead({'name': 'Lead'})


if __name__ == '__main__':
    unittest.main()
