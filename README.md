# alextest

매일 할일을 관리하는 서비스 (Daily Todo Management Service)

## 기능

- 할일 목록 관리 및 듀데이트(마감일) 설정
- 오늘 할일 우선순위 설정 (순서 조정 가능)
- 할일별 목표시간(분) 설정
- 완료 여부 체크
- Google Calendar / Google Tasks 연동 가져오기·내보내기, 직접 추가

## 실행

```bash
pip install -r requirements.txt
python app.py
```

브라우저에서 http://localhost:5000 접속.

## Google 연동 설정 (선택)

Google Calendar/Tasks 연동을 사용하려면 [Google Cloud Console](https://console.cloud.google.com/)에서
OAuth 클라이언트(웹 애플리케이션)를 만들고 아래 환경변수를 설정하세요.

```bash
export GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
export GOOGLE_CLIENT_SECRET=xxx
export GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback  # 기본값
```

리디렉션 URI를 OAuth 클라이언트의 승인된 리디렉션 URI 목록에 동일하게 등록해야 합니다.
설정 후 앱의 "Google 계정 연결" 버튼으로 인증하면 캘린더/할일 가져오기·내보내기 버튼을 사용할 수 있습니다.
환경변수를 설정하지 않아도 나머지 기능(목록/듀데이트/우선순위/목표시간/완료 체크/직접 추가)은 정상 동작합니다.

## 아이 한글 놀이터 (3세 아동용 한글 학습 게임)

`/hangul-game` 경로에서 아직 글자를 모르는 아이도 혼자 탐색할 수 있는 한글 학습 게임을 제공합니다.

- 🦁 자음 배우기 / 🍦 모음 배우기: 큰 글자 카드 + 그림 + 예시 단어를 보고 스피커 버튼(🔊)으로 소리를 들어요.
- 🎯 짝짓기 게임: 들려주는 단어에 맞는 글자를 3개 보기 중에서 찾아요. 정답을 맞히면 별과 함께 칭찬 효과가 나옵니다.
- 🔤 단어 만들기 (레벨 1): 그림 힌트를 보고 자음 → 모음 순서로 글자를 하나씩 골라 2글자 낱말(나비, 거미, 우유 등)을 직접 완성해요. 레벨 1은 받침 없이 기본 자음 14개·기본 모음 10개로만 이루어진 낱말만 사용합니다. 완성하면 실제 한글 음절로 조합되어 표시되고 칭찬 효과와 별을 받습니다.
- 별 개수는 브라우저에 저장되어 다음에 다시 열어도 유지됩니다.
- 브라우저의 음성 합성(Web Speech API)을 사용하므로 한국어 음성을 지원하는 브라우저에서 소리가 재생됩니다.
- 서버 실행 없이 태블릿 등에서 항상 접속할 수 있도록 `docs/index.html`에 같은 게임의 독립 실행형(단일 HTML) 버전을 포함했습니다. GitHub 저장소 Settings → Pages에서 Source를 `main` 브랜치의 `/docs` 폴더로 지정하면 `https://<사용자명>.github.io/<저장소명>/` 주소로 항상 접속할 수 있습니다.

## API

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/todos` | 전체 할일 목록 (쿼리: `due_date`, `today_only`, `include_completed`) |
| GET | `/api/todos/today` | 오늘 할일 (우선순위 순) |
| POST | `/api/todos` | 할일 생성 |
| PATCH | `/api/todos/<id>` | 할일 수정 (제목/설명/듀데이트/목표시간) |
| DELETE | `/api/todos/<id>` | 할일 삭제 |
| POST | `/api/todos/<id>/complete` | 완료 여부 설정 |
| POST | `/api/todos/<id>/today-priority` | 오늘 우선순위 설정/해제 |
| PUT | `/api/today/order` | 오늘 할일 순서 일괄 변경 |
| POST | `/api/sync/calendar` | 구글 캘린더 일정 가져오기 |
| POST | `/api/sync/tasks` | 구글 Tasks 가져오기 |
| POST | `/api/todos/<id>/push/calendar` | 할일을 구글 캘린더 일정으로 내보내기 |
| POST | `/api/todos/<id>/push/tasks` | 할일을 구글 Tasks로 내보내기 |

## 자금 캘린더 (`/fund-calendar`)

구글 시트 「자금 현황 보고」의 `매출_YYMM` · `지출_YYMM` · `자금현황_YYMM` 시트를 읽어 법인별 월간 자금 캘린더를 보여줍니다.

- 매출은 `입금일`에 `당월입금` 금액으로 입금(+), 지출은 `지급일`에 `실지급액`으로 출금(−) 표시합니다.
- **품의번호(`품의No`)가 있으면 확정(채움), 없으면 추정(점선 테두리)** 으로 구분하고 KPI에도 확정/추정 합계를 나눠 보여줍니다.
- 기준일까지는 `자금현황` 시트의 일별 가용자금을, 그 다음 날부터는 기준 잔고 ± 달력의 입·출금으로 잔고를 계산합니다. 기준일·기준 잔고·경고 잔고는 "잔고 기준 설정"에서 바꿀 수 있습니다.
- 달력/목록 보기, 법인·월 이동, 원/천원/백만원 단위, 확정·추정·입금·출금 필터, 검색, 끌어서 날짜 이동, 클릭 수정, 항목 추가, 되돌리기를 지원합니다. 편집 내용은 브라우저에만 저장되며 원본 시트는 바뀌지 않습니다.
- 날짜가 없거나 해당 월 밖인 항목은 오른쪽 "날짜 없음·기간 외" 칸에 모입니다.

회사 자금 데이터는 저장소에 커밋하지 않습니다(`fund_calendar/data/`는 `.gitignore`). 쓰는 방법은 둘 중 하나입니다.

1. 페이지의 **파일 → 엑셀(xlsx) 불러오기**로 시트에서 받은 xlsx를 직접 엽니다(브라우저 안에서만 읽음).
2. 서버에 데이터를 넣어 둡니다.

```bash
pip install openpyxl
python fund_calendar/extract_data.py 자금현황.xlsx -o fund_calendar/data/fund-data.json
# 데이터가 내장된 단일 HTML이 필요하면
python fund_calendar/extract_data.py 자금현황.xlsx --embed fund_calendar/data/fund-calendar.html
```

추출 시 은행·계좌번호·예금주 컬럼은 버립니다.
