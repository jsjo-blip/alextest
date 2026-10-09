#!/usr/bin/env python3
"""Build the web app's initial database rows from the markdown study log.

Writes one JSON file per document under <out_dir>/<collection>/<doc_id>.json
plus a batch manifest (<out_dir>/batch.json) for the ArtifactData tool.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "seed"

REVIEW_IDS = {
    "2026-10-03": [],
    "2026-10-04": ["price-in", "tighten-purse-strings", "hedge-bets"],
    "2026-10-05": ["face-headwinds", "war-chest", "burn-rate", "sticking-point"],
    "2026-10-06": ["drive-hard-bargain", "tighten-purse-strings", "price-in", "leave-money-on-table"],
    "2026-10-07": ["down-round", "hedge-bets", "soft-landing", "knock-on-effect"],
    "2026-10-08": ["face-headwinds", "sticking-point", "hawkish-dovish-tone", "keep-powder-dry"],
    "2026-10-09": ["bottom-line", "paper-over-cracks", "write-down", "stoke-inflation"],
}


def fill(prompt, answers, vocab, hint=""):
    return {"type": "fill", "prompt": prompt, "answers": answers, "vocab": [vocab], "hint": hint}


def ko(prompt, answers, vocab, hint=""):
    return {"type": "ko", "prompt": prompt, "answers": answers, "vocab": [vocab], "hint": hint}


def mc(prompt, options, correct, vocab):
    return {"type": "mc", "prompt": prompt, "options": options, "correct": correct, "vocab": [vocab]}


def write(prompt, model, vocab):
    return {"type": "write", "prompt": prompt, "model": model, "vocab": vocab}


TESTS = {
    "2026-10-03": [
        fill("After two years of record sales, the brand is now ________ as consumers cut back on luxury goods.",
             ["facing stiff headwinds", "facing headwinds"], "face-headwinds", "f_____ s____ h________"),
        fill("Bond yields barely moved after the announcement because traders had ________ weeks earlier.",
             ["priced it in", "priced in it"], "price-in", "p_____ it i_"),
        fill("The family-run brewery has been quietly building a ________ so it can buy out smaller competitors.",
             ["war chest"], "war-chest", "w__ c____"),
        ko("회사가 지출을 줄이기로 했다. → The company decided to ________.",
           ["tighten the purse strings", "tighten its purse strings"], "tighten-purse-strings", "t______ the p____ s______"),
        mc("A fund manager isn't sure whether tech or energy stocks will win next year, so she splits her portfolio between both. What is she doing?",
           ["pricing in the market", "hedging her bets", "building a war chest", "tightening the purse strings"], 1, "hedge-bets"),
        write("war chest와 hedge one's bets를 모두 써서, 스타트업이 투자금을 어떻게 쓸지 고민하는 상황을 1~2문장으로 쓰세요.",
              "Rather than spend its entire war chest on one market, the startup hedged its bets by testing two smaller launches first.",
              ["war-chest", "hedge-bets"]),
        write("price in을 써서, 금리·환율·주가 등 실제 경제 뉴스 하나를 설명하세요.",
              "The KOSPI barely reacted to the rate cut because investors had already priced it in.",
              ["price-in"]),
    ],
    "2026-10-04": [
        fill("The CFO warned that at the current ________, the company would run out of cash in nine months.",
             ["burn rate"], "burn-rate", "b___ r___"),
        fill("Rather than accept a ________ that would dilute early employees, the founders chose to cut costs and wait.",
             ["down round"], "down-round", "d___ r____"),
        fill("The landlord ________: a ten-year lease, no rent-free period, and a 5% annual increase.",
             ["drove a hard bargain"], "drive-hard-bargain", "d____ a h___ b______"),
        fill("Korean exporters are ________ from a strong won and weaker demand in China.",
             ["facing stiff headwinds", "facing headwinds"], "face-headwinds", "f_____ s____ h________"),
        ko("첫 제안을 바로 받아들이면 더 받을 수 있었던 돈을 놓치는 셈이야. → If you accept the first offer, you're ________.",
           ["leaving money on the table"], "leave-money-on-table", "l______ m____ o_ t__ t____"),
        ko("그 기업은 경기 침체기에 경쟁사를 인수하려고 3억 달러의 비축 자금을 마련했다. → The company built a $300 million ________ to buy rivals.",
           ["war chest"], "war-chest", "w__ c____"),
        mc("Both companies agreed on price and delivery dates, but the deal stalled over liability for shipping delays. The liability clause was the ________.",
           ["war chest", "sticking point", "burn rate", "down round"], 1, "sticking-point"),
        mc("The central bank cut rates as expected, yet stock prices didn't move at all. Why?",
           ["Investors had already priced it in.", "Investors were driving a hard bargain.",
            "Investors were leaving money on the table.", "Investors were facing headwinds."], 0, "price-in"),
        write("tighten the purse strings를 써서, 회사나 가계가 지출을 줄이는 상황을 한 문장으로 쓰세요.",
              "After two weak quarters, management tightened the purse strings and froze all non-essential travel.",
              ["tighten-purse-strings"]),
        write("hedge one's bets를 써서, 업무에서 위험을 분산하는 상황을 한 문장으로 쓰세요.",
              "We're hedging our bets by piloting the service with both B2B fleets and individual drivers.",
              ["hedge-bets"]),
    ],
    "2026-10-05": [
        fill("If inflation cools without a spike in unemployment, economists will call it a textbook ________.",
             ["soft landing"], "soft-landing", "s___ l______"),
        fill("Markets rallied after the governor ________, signaling that rate cuts could come as early as January.",
             ["struck a dovish tone", "struck a surprisingly dovish tone"], "hawkish-dovish-tone", "s_____ a d_____ t___"),
        fill("Higher shipping costs had a ________ on furniture retailers, who passed the increase on to customers.",
             ["knock-on effect", "knock on effect"], "knock-on-effect", "k____-o_ e_____"),
        fill("After hiring 40 engineers in six months, the startup's monthly ________ nearly doubled.",
             ["burn rate"], "burn-rate", "b___ r___"),
        ko("대규모 현금 지원은 인플레이션을 부추길 수 있다. → Large cash handouts could ________.",
           ["stoke inflation"], "stoke-inflation", "s____ i________"),
        ko("가격은 합의됐지만, 지식재산권 조항이 마지막 걸림돌로 남았다. → The IP clause remained the final ________.",
           ["sticking point"], "sticking-point", "s_______ p____"),
        mc("A private equity firm has $2 billion ready but expects prices to fall further, so it decides not to buy anything yet. The firm is ________.",
           ["leaving money on the table", "keeping its powder dry", "facing headwinds", "stoking inflation"], 1, "keep-powder-dry"),
        mc("A seller accepts a buyer's first offer within five minutes, then learns the buyer had a budget 30% higher. She ________.",
           ["drove a hard bargain", "built a war chest", "left money on the table", "priced it in"], 2, "leave-money-on-table"),
        write("face (stiff) headwinds를 써서, 한국 산업 하나가 처한 상황을 한 문장으로 쓰세요.",
              "Korea's battery makers are facing stiff headwinds from cheaper Chinese rivals and slowing EV demand.",
              ["face-headwinds"]),
        write("war chest를 써서, 기업이 위기나 기회에 대비하는 상황을 한 문장으로 쓰세요.",
              "The company has built a war chest of 500 billion won to buy distressed competitors.",
              ["war-chest"]),
    ],
    "2026-10-06": [
        fill("Shares fell 8% after the chipmaker ________ for the third quarter in a row.",
             ["missed estimates", "missed analysts estimates", "missed expectations"], "beat-estimates", "m_____ e________"),
        fill("The airline ________ the value of its older aircraft by $500 million.",
             ["wrote down"], "write-down", "w____ d___"),
        fill("Cutting delivery costs had a bigger impact on our ________ than any price increase.",
             ["bottom line"], "bottom-line", "b_____ l___"),
        fill("Hyundai's purchasing team is known for ________ with its suppliers.",
             ["driving a hard bargain"], "drive-hard-bargain", "d______ a h___ b______"),
        ko("그 회사의 경영진은 수년간 분식회계를 한 사실이 드러났다. → The executives were found to have been ________ for years.",
           ["cooking the books"], "cook-books", "c______ t__ b____"),
        ko("매출이 줄자 경영진은 허리띠를 졸라맸다. → When sales dropped, management ________.",
           ["tightened the purse strings", "tightened its purse strings", "tightened their purse strings"],
           "tighten-purse-strings", "t________ the p____ s______"),
        mc("A struggling cafe chain repaints its stores and runs a celebrity ad campaign, but its coffee is still mediocre and rents too high. The makeover only ________.",
           ["beats estimates", "papers over the cracks", "cooks the books", "prices it in"], 1, "paper-over-cracks"),
        mc("A startup last valued at $500 million raises new money at a $300 million valuation. This is called a ________.",
           ["write-down", "soft landing", "down round", "war chest"], 2, "down-round"),
        write("price in을 써서, 주가나 환율이 뉴스에 반응하지 않은 이유를 설명하세요.",
              "The dollar hardly moved on the jobs data because traders had priced in a weak number.",
              ["price-in"]),
        write("leave money on the table을 써서, 연봉이나 거래 협상에 대한 조언을 한 문장으로 쓰세요.",
              "Always research market salaries first, or you may leave money on the table.",
              ["leave-money-on-table"]),
    ],
    "2026-10-07": [
        fill("Before hiring consultants, let's go after the ________: renegotiating our cloud contracts could save 15%.",
             ["low-hanging fruit", "low hanging fruit"], "low-hanging-fruit", "l__-h______ f____"),
        fill("Coupang can offer free delivery partly because of the ________ it gained from its huge logistics network.",
             ["economies of scale"], "economies-of-scale", "e________ o_ s____"),
        fill("Despite heavy losses, the founder is ________ the subscription model rather than switching to ads.",
             ["doubling down on"], "double-down-on", "d_______ d___ o_"),
        fill("The rate hike in the U.S. had a ________ on emerging-market currencies, including the won.",
             ["knock-on effect", "knock on effect"], "knock-on-effect", "k____-o_ e_____"),
        ko("신사업에 손대지 말고 본업에 집중하라고 투자자들이 경고했다. → Investors warned the company to ________.",
           ["stick to its knitting", "stick to their knitting"], "stick-to-knitting", "s____ t_ i__ k_______"),
        ko("직원 10명을 더 뽑는다고 매출에 큰 변화가 생기지는 않을 것이다. → Hiring ten more people won't ________ on revenue.",
           ["move the needle"], "move-the-needle", "m___ t__ n_____"),
        mc("Inflation has fallen from 5% to 2.5% over two years, and unemployment barely rose. Economists call this a ________.",
           ["down round", "soft landing", "knock-on effect", "war chest"], 1, "soft-landing"),
        mc("A fashion startup raises money at a valuation 40% below its last round because growth stalled. It went through a ________.",
           ["down round", "write-down", "sticking point", "burn rate"], 0, "down-round"),
        write("hedge one's bets를 써서, 투자나 커리어에서 위험을 분산하는 상황을 한 문장으로 쓰세요.",
              "She hedged her bets by keeping her day job while building her side business.",
              ["hedge-bets"]),
        write("stoke inflation을 써서, 정부 정책이나 유가 상승이 물가에 미칠 영향을 설명하세요.",
              "Economists warn that another round of cash handouts could stoke inflation.",
              ["stoke-inflation"]),
    ],
    "2026-10-08": [
        fill("After the new line opened, the factory ________ output from 2,000 to 10,000 units a month.",
             ["ramped up"], "ramp-up", "r_____ u_"),
        fill("The won strengthened ________ record chip exports.",
             ["on the back of"], "on-the-back-of", "o_ t__ b___ o_"),
        fill("Rising coffee bean prices were ________ customers, who now pay 500 won more per cup.",
             ["passed on to"], "pass-on-costs", "p_____ o_ t_"),
        fill("LG Energy Solution's quarterly profit ________ thanks to higher-than-expected U.S. sales.",
             ["beat estimates", "beat expectations", "beat analysts estimates"], "beat-estimates", "b___ e________"),
        ko("인허가 절차가 프로젝트 전체의 병목이 되었다. → The permit process became the main ________ for the project.",
           ["bottleneck"], "bottleneck", "b_________"),
        ko("미국 정부는 반도체 공장의 자국 복귀를 장려하고 있다. → The U.S. government is encouraging the ________ of chip factories.",
           ["reshoring"], "reshoring", "r________"),
        mc("The governor says inflation is \"still far too high\" and rates may need to rise further. He has ________.",
           ["struck a dovish tone", "struck a hawkish tone", "kept his powder dry", "passed on the costs"], 1, "hawkish-dovish-tone"),
        mc("Two companies agree on price and volume, but neither accepts the other's choice of court for disputes. That clause is the ________.",
           ["bottleneck", "war chest", "sticking point", "bottom line"], 2, "sticking-point"),
        write("keep one's powder dry를 써서, 투자자나 기업이 지금은 투자를 미루는 이유를 한 문장으로 쓰세요.",
              "With rates still high, we're keeping our powder dry until valuations come down.",
              ["keep-powder-dry"]),
        write("face (stiff) headwinds를 써서, 회사나 업계가 겪는 어려움을 한 문장으로 쓰세요.",
              "Our industry is facing stiff headwinds as car sales slow and repair costs rise.",
              ["face-headwinds"]),
    ],
}


def parse_story(path):
    text = path.read_text()
    title = re.search(r"^## (.+)$", text, re.M).group(1).strip()
    body = text.split(f"## {title}", 1)[1].split("\n---", 1)[0].strip()
    rows = re.findall(r"^\| \d+ \| \*\*(.+?)\*\*.*?\| (.+?) \| \*(.+?)\* \|$", text, re.M)
    bonus = re.findall(r"^- \*\*(.+?)\*\*(?: \((.+?)\))? — (.+)$", text.split("## Bonus", 1)[-1], re.M)
    return title, body, rows, bonus


def main():
    vocab_src = json.loads((ROOT / "vocab.json").read_text())["expressions"]
    docs = []  # (collection, doc_id, data)
    by_day = {}
    for e in vocab_src:
        by_day.setdefault(e["introduced"], []).append(e)

    for story in sorted((ROOT / "stories").glob("*.md")):
        date = story.stem
        title, body, rows, bonus = parse_story(story)
        day_vocab = by_day.get(date, [])
        for e, row in zip(day_vocab, rows):
            docs.append(("vocab", e["id"], {
                "expression": e["expression"], "meaning": e["meaning_ko"],
                "example": row[2], "introduced": date, "box": e["box"],
                "next_review": e["next_review"], "last_tested": None,
                "correct": 0, "wrong": 0,
            }))
        docs.append(("days", date, {
            "date": date, "title": title, "story": body, "level": 3,
            "newIds": [e["id"] for e in day_vocab], "reviewIds": REVIEW_IDS.get(date, []),
            "bonus": [{"term": b[0], "pos": b[1], "meaning": b[2]} for b in bonus],
            "studied": False,
        }))

    for date, qs in TESTS.items():
        for i, q in enumerate(qs):
            q["id"] = f"q{i + 1}"
        docs.append(("tests", date, {"date": date, "kind": "daily", "questions": qs, "submitted": False}))

    docs.append(("meta", "state", {
        "level": 3, "testsSinceChange": 0,
        "levelHistory": [{"date": "2026-10-09", "from": None, "to": 3, "reason": "시작 레벨 (Advanced)"}],
    }))

    OUT.mkdir(parents=True, exist_ok=True)
    writes = []
    for coll, doc_id, data in docs:
        p = OUT / coll / f"{doc_id}.json"
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(data, ensure_ascii=False, indent=1))
        writes.append({"op": "set", "collection": coll, "doc_id": doc_id, "file_path": str(p)})
    (OUT / "batch.json").write_text(json.dumps(writes, indent=1))
    print(f"{len(writes)} documents -> {OUT}")


if __name__ == "__main__":
    main()
