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
- 별 개수는 브라우저에 저장되어 다음에 다시 열어도 유지됩니다.
- 브라우저의 음성 합성(Web Speech API)을 사용하므로 한국어 음성을 지원하는 브라우저에서 소리가 재생됩니다.

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
