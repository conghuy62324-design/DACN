"""Reconstruct the pre-edit planner and verify byte-for-byte against captured SHA.
No application source file is overwritten. Used only to replay frozen v3 assertions.
"""
from pathlib import Path
import json
import hashlib
import difflib
import itertools

s = Path('src/services/tourPlannerService.ts').read_text('utf-8')
s = s.replace("import { assessPlannerBudget } from '../utils/plannerFeasibility.js';\n", '')
for line in ['  costSource?: string;\n', '  lodgingCostSource?: string;\n', '  overBudgetVND: number;\n', '  constraintViolations: string[];\n']:
    s = s.replace(line, '')
s = s.replace('return Boolean(location && destination) && location === destination;', 'return location === destination || location.includes(destination) || destination.includes(location);')
a = s.index('    // Preserve genuine zero.')
b = s.index('    // 1. ', a)
s = s[:a] + "    const catalogPrice = (price: number, fallback: number) =>\n      typeof price === 'number' && Number.isFinite(price) && price >= 0 ? price : fallback;\n\n" + s[b:]
a = s.index('    const destinationPlaces =')
b = s.index('    // 2.', a)
s = s[:a] + "    const attractionCandidates = allPlaces.filter(\n      (p) => p.category === 'tour' || p.category === 'attraction'\n    );\n    const restaurantCandidates = allPlaces.filter((p) => p.category === 'restaurant');\n    const hotelCandidates = allPlaces.filter((p) => p.category === 'hotel');\n\n" + s[b:]
s = s.replace("        const estimate = priceEstimate(morningSpot, 300000, 'người lớn quy đổi/lượt tham quan');\n        const morningCost = groupCost(estimate.amount);", '        const morningCost = groupCost(Math.min(catalogPrice(morningSpot.priceFrom, 300000), dailyBudgetPerPerson * 0.4));')
s = s.replace("        const estimate = priceEstimate(afternoonSpot, 300000, 'người lớn quy đổi/lượt tham quan');\n        const afternoonCost = groupCost(estimate.amount);", '        const afternoonCost = groupCost(Math.min(catalogPrice(afternoonSpot.priceFrom, 200000), dailyBudgetPerPerson * 0.3));')
s = s.replace("      const lunchEstimate = priceEstimate(lunchRestaurant, 150000, 'người lớn quy đổi/bữa trưa');\n      const lunchCost = groupCost(lunchEstimate.amount);", '      const lunchCost = groupCost(150000);')
s = '\n'.join(line for line in s.split('\n') if 'costSource:' not in line and 'lodgingCostSource:' not in line and 'const lodgingEstimate =' not in line)
s = s.replace('Math.round(lodgingEstimate.amount)', 'Math.round(selectedHotel ? catalogPrice(selectedHotel.priceFrom, 400000) : 400000)')
s = s.replace('      ...assessPlannerBudget(input.totalBudget, totalTripEstimatedCost),', "      costDifferenceVND: costDiff,\n      budgetStatus: isWithinBudget ? 'within_budget' : 'over_budget',")
new = 'Tham quan dùng priceFrom, thiếu giá tạm tính 300.000đ/người lớn quy đổi/lượt. Bữa trưa dùng priceFrom nhà hàng, thiếu giá tạm tính 150.000đ; bữa tối tạm tính 200.000đ/người lớn quy đổi. Nguồn giả định: định mức planner T11-B trong source, chưa khảo sát giá thị trường; xem nhãn từng khoản. Giá 0 được giữ nguyên; không cắt giá theo ngân sách.'
old = 'Ăn trưa/tối tạm tính 150.000đ/200.000đ mỗi người lớn quy đổi. Tham quan là ước tính priceFrom với hạn mức 40%/30% ngân sách ngày/người, không phải báo giá vé.'
s = s.replace(new, old)
expected = json.loads(Path('../docs/evidence/t11b/before-v2/scenario_results_v2.json').read_text('utf-8'))['sourceSha256']['src/services/tourPlannerService.ts']
# The preexisting working tree used mixed LF/CRLF. Keep untouched line endings;
# find the changed blocks' original endings by the already captured SHA, never
# relax the byte-for-byte guard or overwrite the application working tree.
original_lines = s.splitlines()
current_lines = Path('src/services/tourPlannerService.ts').read_bytes().splitlines(keepends=True)
plain = [line.rstrip(b'\r\n').decode('utf-8') for line in current_lines]
parts = []
for tag, a, b, c, d in difflib.SequenceMatcher(None, original_lines, plain, autojunk=False).get_opcodes():
    if tag == 'equal':
        parts.append([b''.join(current_lines[c:d])])
    elif a != b:
        group = original_lines[a:b]
        parts.append(['\n'.join(group).encode() + b'\n', '\r\n'.join(group).encode() + b'\r\n'])
for chunks in itertools.product(*parts):
    data = b''.join(chunks)
    if hashlib.sha256(data).hexdigest() == expected:
        Path('../docs/evidence/t11b/baseline-tourPlannerService.ts.txt').write_bytes(data)
        print(json.dumps({'baselineSourceVerified': True, 'sha256': expected}))
        break
else:
    raise AssertionError('Cannot reproduce original source SHA; refuse replay')
