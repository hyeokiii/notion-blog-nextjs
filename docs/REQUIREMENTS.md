# 요구사항 명세서 (SRS)

**프로젝트명:** Notion Blog Next  
**문서 버전:** 1.0  
**작성일:** 2026-05-19  
**문서 목적:** Notion을 CMS로 활용하는 SEO 최적화 개인 블로그의 기능·비기능·기술 요구사항 정의

---

## 1. 문서 개요

### 1.1 배경

Notion의 글쓰기·콘텐츠 관리 환경을 CMS로 사용하고, Next.js 15 기반 웹 애플리케이션으로 공개 블로그를 제공한다. 작성자는 Notion에서만 콘텐츠를 관리하고, 방문자는 빠르고 검색 엔진에 친화적인 블로그를 이용한다.

### 1.2 목표

| 목표 | 설명 |
|------|------|
| 콘텐츠 분리 | Notion = CMS, Next.js = 프레젠테이션·배포 |
| SEO | 메타데이터, 구조화 데이터, 정적/ISR 페이지로 검색 노출 최적화 |
| 성능 | Server Components, ISR로 초기 로딩·TTFB 개선 |
| 유지보수 | TypeScript, 컴포넌트 기반 UI(ShadcnUI)로 확장·변경 용이 |

### 1.3 용어 정의

| 용어 | 정의 |
|------|------|
| CMS | Notion Database/API를 통한 콘텐츠 저장·조회 |
| ISR | Incremental Static Regeneration — 정적 페이지의 주기적·온디맨드 재생성 |
| 게시물(Post) | Notion DB의 한 행(페이지)에 대응하는 블로그 글 |
| 발행(Published) | 웹에 노출 가능한 상태의 게시물 |

### 1.4 범위

**포함**

- Notion DB 연동, 게시물 목록·상세·태그·검색(선택)
- 반응형 UI, 다크/라이트 모드(선택)
- Giscus 댓글
- SEO·OG·사이트맵·RSS(선택)

**제외 (초기 범위 예시)**

- Notion 외 별도 관리자(Admin) 화면
- 회원 가입·로그인
- 유료 구독·결제
- Notion 실시간 동기화(Webhook 없이 폴링/재검증만 할 경우)

---

## 2. 이해관계자 및 사용자

| 역할 | 설명 | 주요 요구 |
|------|------|-----------|
| 블로그 운영자(작성자) | Notion에서 글 작성·수정 | Notion만으로 발행·수정, 미리보기 불필요 또는 선택 |
| 방문자(독자) | 공개 블로그 열람 | 빠른 로딩, 가독성, 모바일 지원, 댓글(선택) |
| 검색 엔진 | 크롤링·인덱싱 | robots, sitemap, 구조화된 HTML·메타 |

---

## 3. 시스템 아키텍처 (개요)

```
[Notion Workspace]
       │ Notion API
       ▼
[Next.js 15 App Router]
  ├─ Server Components (데이터 fetch)
  ├─ ISR / revalidate (캐시·재생성)
  └─ Static/SSR Pages
       │
       ▼
[방문자 브라우저] ──► [Giscus (GitHub Discussions)]
```

### 3.1 기술 스택 요구

| 구분 | 기술 | 요구 사항 |
|------|------|-----------|
| 프레임워크 | Next.js v15 | App Router 필수 |
| 렌더링 | Server Components | 목록·상세 데이터 fetch는 서버에서 수행 |
| 캐싱 | ISR | `revalidate` 또는 `revalidatePath`/`revalidateTag` 정책 문서화 |
| 언어 | TypeScript | strict 모드 권장, API 응답·도메인 타입 정의 |
| 스타일 | TailwindCSS | 디자인 토큰·반응형 breakpoint 일관 적용 |
| UI | ShadcnUI (Radix) | 접근성·키보드 포커스 준수 |
| CMS | Notion API | Integration Token, Database ID 환경 변수 |
| 댓글 | Giscus | repo, repoId, category 등 환경 변수 |

---

## 4. 기능 요구사항 (FR)

### FR-01 Notion CMS 연동

| ID | 요구사항 | 우선순위 | 비고 |
|----|----------|----------|------|
| FR-01-01 | Notion Database를 단일 소스로 게시물 목록을 조회한다 | 필수 | |
| FR-01-02 | 게시물 상세는 Notion Page ID(또는 slug)로 조회한다 | 필수 | |
| FR-01-03 | Notion 블록을 HTML/React로 렌더링한다 (paragraph, heading, list, code, image, quote, callout 등) | 필수 | 렌더러 라이브러리 또는 자체 매핑 |
| FR-01-04 | API 키·DB ID는 서버 환경 변수로만 관리하며 클라이언트에 노출하지 않는다 | 필수 | |
| FR-01-05 | Notion API 오류 시 사용자에게 친화적 fallback(빈 목록, 404, 재시도 안내)를 표시한다 | 필수 | |

### FR-02 Notion 데이터 모델 (권장 스키마)

Notion Database 속성(프로퍼티) 최소 정의:

| 속성명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| Title | Title | Y | 게시물 제목 |
| Slug | Text 또는 Formula | Y | URL 경로 (`/blog/{slug}`) |
| Status | Select | Y | `Draft` / `Published` (Published만 노출) |
| PublishedAt | Date | Y | 정렬·표시용 발행일 |
| Summary | Text | N | 목록 카드·메타 description |
| Tags | Multi-select | N | 태그 필터·목록 |
| Cover | Files 또는 URL | N | OG 이미지·히어로 이미지 |
| Author | Text 또는 Person | N | 작성자 표시 |

**비즈니스 규칙**

- `Status !== Published` 인 항목은 공개 API·페이지에 포함하지 않는다.
- Slug는 URL-safe, 유일해야 하며 중복 시 빌드/런타임에서 검증·로그한다.

### FR-03 라우팅 및 페이지

| ID | 페이지 | 경로(예) | 요구사항 | 우선순위 |
|----|--------|----------|----------|----------|
| FR-03-01 | 홈 | `/` | 최근 게시물 N건, 소개(선택), CTA | 필수 |
| FR-03-02 | 블로그 목록 | `/blog` | 페이지네이션 또는 무한 스크롤(택일), 발행일 내림차순 | 필수 |
| FR-03-03 | 게시물 상세 | `/blog/[slug]` | 본문, 메타, 태그, 이전/다음 글(선택) | 필수 |
| FR-03-04 | 태그 목록 | `/tags` | 전체 태그 및 게시물 수 | 권장 |
| FR-03-05 | 태그 상세 | `/tags/[tag]` | 해당 태그 게시물만 필터 | 권장 |
| FR-03-06 | 소개 | `/about` | 정적 또는 Notion 페이지 연동 | 선택 |
| FR-03-07 | 404 | `not-found` | 존재하지 않는 slug 처리 | 필수 |

### FR-04 콘텐츠 렌더링

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| FR-04-01 | 제목 계층(h1~h3) 시맨틱 마크업 및 목차(TOC, 선택) | 권장 |
| FR-04-02 | 코드 블록 syntax highlighting | 권장 |
| FR-04-03 | 외부·Notion 이미지 lazy loading, alt 텍스트 | 필수 |
| FR-04-04 | Notion embed(YouTube, Tweet 등) 안전한 iframe/컴포넌트 처리 | 선택 |
| FR-04-05 | 본문 내 링크는 새 탭·`rel` 속성 정책 준수 | 권장 |

### FR-05 Giscus 댓글

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| FR-05-01 | 게시물 상세 하단에 Giscus 위젯을 표시한다 | 필수 |
| FR-05-02 | `mapping`은 `pathname` 또는 `title` 중 하나로 고정한다 | 필수 |
| FR-05-03 | Giscus는 Client Component로만 로드하여 hydration 범위를 최소화한다 | 권장 |
| FR-05-04 | 다크 모드와 Giscus `theme` 연동 | 권장 |

### FR-06 검색·필터 (선택)

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| FR-06-01 | 제목·요약 기준 클라이언트 또는 서버 검색 | 선택 |
| FR-06-02 | 태그·연도 필터 | 권장 |

### FR-07 배포·콘텐츠 갱신

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| FR-07-01 | ISR `revalidate` 시간(예: 3600초)을 설정 가능하게 한다 | 필수 |
| FR-07-02 | Notion 수정 후 최대 revalidate 주기 내에 반영된다 | 필수 |
| FR-07-03 | (선택) On-demand revalidation API Route + 시크릿 토큰 | 선택 |

---

## 5. 비기능 요구사항 (NFR)

### NFR-01 성능

| ID | 지표 | 목표 |
|----|------|------|
| NFR-01-01 | LCP (모바일) | < 2.5s (3G Fast 기준 목표) |
| NFR-01-02 | 목록·상세 TTFB | ISR 캐시 히트 시 < 200ms (호스팅 환경 의존) |
| NFR-01-03 | 이미지 | `next/image` 또는 최적화 URL 사용 |
| NFR-01-04 | JS 번들 | 상세 페이지에서 Giscus 등 필수 Client만 로드 |

### NFR-02 SEO

| ID | 요구사항 |
|----|----------|
| NFR-02-01 | 페이지별 `title`, `description`, `canonical` |
| NFR-02-02 | Open Graph, Twitter Card (og:image = Cover 우선) |
| NFR-02-03 | `sitemap.xml` 자동 생성 (Published 게시물만) |
| NFR-02-04 | `robots.txt` |
| NFR-02-05 | JSON-LD `BlogPosting` (headline, datePublished, author) |
| NFR-02-06 | 시맨틱 HTML: `article`, `time`, `nav` |

### NFR-03 접근성 (a11y)

| ID | 요구사항 |
|----|----------|
| NFR-03-01 | WCAG 2.1 Level AA 지향 (색 대비, 포커스 링) |
| NFR-03-02 | Shadcn/Radix 컴포넌트 기본 a11y 활용 |
| NFR-03-03 | 키보드로 내비게이션·댓글 영역 접근 가능 |

### NFR-04 보안

| ID | 요구사항 |
|----|----------|
| NFR-04-01 | `NOTION_API_KEY` 등 비밀은 서버 전용 |
| NFR-04-02 | Revalidation API는 Bearer/Query secret 검증 |
| NFR-04-03 | `Content-Security-Policy`에서 Giscus·GitHub 도메인 허용 정책 정의 |

### NFR-05 호환성·반응형

| ID | 요구사항 |
|----|----------|
| NFR-05-01 | Mobile First, breakpoint: sm/md/lg/xl (Tailwind 기본) |
| NFR-05-02 | 최신 Chrome, Firefox, Safari, Edge 2버전 지원 |

### NFR-06 운영·관측

| ID | 요구사항 |
|----|----------|
| NFR-06-01 | Notion API 실패 로깅 (서버, PII 제외) |
| NFR-06-02 | (선택) Vercel Analytics / Web Vitals |

---

## 6. UI/UX 요구사항

### 6.1 공통 레이아웃

- 헤더: 로고/사이트명, 블로그, 태그, About 링크
- 푸터: 저작권, GitHub, RSS(선택)
- (권장) 다크/라이트 토글 — `class` 기반, 시스템 설정 존중

### 6.2 블로그 목록

- 카드: Cover(있을 때), 제목, Summary, PublishedAt, Tags
- 호버·포커스 상태 명확
- 빈 목록: 안내 문구

### 6.3 게시물 상세

- 읽기 폭 제한(max-width), 본문 타이포그래피(prose)
- 상단: 제목, 날짜, 태그, 예상 읽기 시간(선택)
- 하단: Giscus, 이전/다음 네비게이션(선택)

### 6.4 디자인 시스템

- ShadcnUI: Button, Card, Badge, Separator, Theme Toggle 등 재사용
- Tailwind: spacing·color 토큰을 `globals.css` CSS 변수로 통일

---

## 7. 환경 변수 및 설정

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `NOTION_API_KEY` | Y | Notion Integration Secret |
| `NOTION_DATABASE_ID` | Y | 게시물 Database ID |
| `NEXT_PUBLIC_SITE_URL` | Y | canonical, OG, sitemap base URL |
| `NEXT_PUBLIC_GISCUS_REPO` | Y | `owner/repo` |
| `NEXT_PUBLIC_GISCUS_REPO_ID` | Y | Giscus 설정값 |
| `NEXT_PUBLIC_GISCUS_CATEGORY_ID` | Y | Discussion category |
| `REVALIDATE_SECRET` | N | On-demand revalidation용 |
| `REVALIDATE_SECONDS` | N | ISR 주기 (기본값 문서화) |

`.env.example` 제공, 실제 `.env`는 저장소에 포함하지 않음.

---

## 8. 디렉터리·모듈 구조 (권장)

```
app/
  layout.tsx
  page.tsx
  blog/
    page.tsx
    [slug]/page.tsx
  tags/
    page.tsx
    [tag]/page.tsx
  sitemap.ts
  robots.ts
components/
  layout/ (Header, Footer)
  blog/ (PostCard, PostBody, TagBadge)
  giscus/
lib/
  notion/ (client, queries, types, blocks-to-react)
  utils/
types/
```

---

## 9. 인수 기준 (Acceptance Criteria)

### AC-01 CMS 연동

- [ ] Notion에서 `Published` 글만 목록·상세에 노출된다.
- [ ] Draft 글 URL 직접 접근 시 404이다.
- [ ] API 키가 브라우저 네트워크 탭에 노출되지 않는다.

### AC-02 페이지

- [ ] `/`, `/blog`, `/blog/[slug]`가 빌드·런타임 오류 없이 동작한다.
- [ ] slug 중복·누락 시 정의된 오류 처리가 있다.

### AC-03 SEO

- [ ] 상세 페이지 소스에 OG 메타·JSON-LD가 포함된다.
- [ ] `/sitemap.xml`에 Published URL만 포함된다.

### AC-04 성능·ISR

- [ ] revalidate 설정 후 Notion 수정 내용이 주기 내 반영된다.
- [ ] Lighthouse SEO 점수 90+ (로컬 기준 목표)

### AC-05 댓글

- [ ] 게시물별 Giscus 스레드가 pathname 기준으로 분리된다.
- [ ] GitHub 로그인 후 댓글 작성 가능하다.

### AC-06 UI

- [ ] 375px·1280px 뷰포트에서 레이아웃 깨짐 없음.
- [ ] 키보드만으로 주요 링크 이동 가능.

---

## 10. 제약 및 리스크

| 항목 | 설명 | 대응 |
|------|------|------|
| Notion API Rate Limit | 요청 과다 시 429 | 캐싱, ISR, 배치 조회 |
| Notion 블록 호환성 | 모든 블록 타입 미지원 가능 | 지원 목록 문서화, 미지원 블록 fallback |
| ISR 지연 | 즉시 반영 아님 | revalidate 주기 단축 또는 on-demand API |
| Giscus 의존 | GitHub·공개 repo 필요 | README에 설정 가이드 |
| 이미지 URL 만료 | Notion signed URL | revalidate 또는 이미지 proxy 검토 |

---

## 11. 마일스톤 (권장)

| 단계 | 산출물 |
|------|--------|
| M1 | 프로젝트 셋업, Notion 연동, 타입·환경 변수 |
| M2 | 목록·상세·블록 렌더링, 404 |
| M3 | 레이아웃·ShadcnUI·반응형·테마 |
| M4 | SEO(sitemap, robots, metadata, JSON-LD) |
| M5 | Giscus, 태그 페이지 |
| M6 | ISR 튜닝, 문서화(README), 배포 |

---

## 12. 참고 문서 (구현 시)

- [Next.js 15 App Router](https://nextjs.org/docs/app)
- [Notion API](https://developers.notion.com/)
- [Giscus](https://giscus.app/)
- [Shadcn UI](https://ui.shadcn.com/)
