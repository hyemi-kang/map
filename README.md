# 도쿄 근교 여행 지도

방 → 책상 → 종이 지도 → 도쿄·가나가와·지바·사이타마 → 지역 → 일정표 → 실제 지도로 이어지는 여행 일정 짜기 사이트입니다.
Next.js(정적 내보내기) + React + `motion` + `three`(종이 지도 셰이더) 로 만들었습니다.

## 실행

```bash
# 회사 네트워크처럼 HTTPS 를 중간에서 풀어 주는 환경에서는 Node 가 인증서를 못 믿으므로 아래 옵션이 필요합니다.
export NODE_OPTIONS=--use-system-ca

npm install
npm run dev          # http://localhost:3000
npm test             # 일정 계산·내보내기·카메라 계산 (vitest)
npm run lint         # tsc --noEmit
npm run build        # 정적 내보내기 → out/
```

`.next` 폴더가 깨졌을 때는 `NEXT_DIST_DIR=.next-b npx next dev --turbopack -p 3101` 처럼 출력 폴더를 바꿔서 띄울 수 있습니다.
GitHub Pages 같은 하위 경로에 올릴 때는 `BASE_PATH=/저장소이름` 을 지정하세요.

## 데이터 만들기

| 명령 | 하는 일 |
| --- | --- |
| `npm run geo` | 동일본 도·현 경계와 4개 도·현의 시구정촌 경계를 내려받아 단순화 (`data/geo/`) |
| `npm run photos` | 일본어 위키백과의 대표 이미지를 받아 Wikimedia Commons 에서 라이선스를 확인하고 `public/photos/` 에 저장. CC BY / CC BY-SA / CC0 / 퍼블릭 도메인만 사용. 위키백과 좌표와 어긋난 스폿도 보고 |

스폿·역·영업시간은 `data/regions.ts` 에 있습니다. 좌표와 영업시간은 대략적인 값이므로 방문 전에 공식 정보를 확인하세요.

## 구성

- `components/room/` 여행 서재(첫 화면). 책상을 누르면 앉는 연출
- `components/map/` 종이 지도(WebGL 셰이더) · 실제 지도(OpenStreetMap 타일) · 드래그/핀치/휠 제스처
- `components/notebook/` 노트(지역 선택, 스팟 고르기, 일정표, 직접 장소 추가)
- `lib/planner.ts` 이동 시간 추정, 점심, 영업시간, 추천 순서, 추가 장소 제안
- `lib/export.ts` 일정을 Google 내 지도(KML)·캘린더(ICS)로 내보내기
- `lib/gmaps.ts` Google 지도 URL 만들기 / 링크·좌표 붙여넣기 해석 (API 키 불필요)

## 알아 둘 점

- 이동 시간은 거리로 계산한 대략적인 값입니다. 실제 환승 시간은 구간별 Google 지도 링크에서 확인하세요.
- 실제 지도는 OpenStreetMap 타일입니다(© OpenStreetMap contributors). 많은 사용자가 쓰는 서비스로 배포한다면
  [타일 사용 정책](https://operations.osmfoundation.org/policies/tiles/)에 맞는 타일 제공자로 바꿔 주세요.
- Google 지도를 같은 자리에 쓰려면 Maps JavaScript API 키(과금 설정 포함)가 필요합니다.
