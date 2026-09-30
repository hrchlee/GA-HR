# 모아 · 프로젝트 보드

GitHub Pages에서 실행하는 독립적인 HTML 프로젝트 보드입니다. 인사관리 시스템이나 데이터에 연결하지 않으며 Firebase가 필요하지 않습니다. 기존 저장소의 `index.html`은 변경하지 않습니다.

## 사용

- 기존 Pages 주소 뒤의 `/projects/`: 실제 프로젝트 보드
- `/projects/?demo=1`: 가상 업무로 체험 (변경사항은 새로고침 시 초기화)
- 프로젝트 생성 후 업무별 담당자(미지정 가능), 날짜, 상태, 진행률, 준비 체크리스트를 등록합니다.
- 일정표의 날짜 칸을 누르면 해당 날짜의 추진 기록을 작성합니다.
- `공유`에서 링크를 복사하여 직접 전달합니다. 이메일을 자동 발송하지 않습니다.

## 공동 편집

화면과 데이터가 모두 `hrchlee/GA-HR`에 있습니다. 별도 서버 없이 GitHub 저장소가 공용 저장소 역할을 합니다.

- 공용 데이터: `projects/data/board.json`
- 조회: 공개 저장소에서는 별도 로그인 없이 읽습니다.
- 편집: 저장소 협업자가 자신의 GitHub Fine-grained personal access token으로 연결합니다. 대상 저장소는 GA-HR, 권한은 Contents: Read and write를 선택합니다. 조직 저장소는 승인이 필요할 수 있습니다.
- 토큰은 현재 탭 메모리에만 보관합니다. 새로고침하거나 연결을 해제하면 사라집니다. 파일이나 localStorage, sessionStorage에 저장하지 않습니다.
- 브랜치 보호 정책이 직접 저장을 막으면 저장할 수 없습니다. 별도 데이터 브랜치를 사용할 경우 `github-config.mjs`의 branch를 변경하고 초기 JSON을 그 브랜치에 준비합니다.
- 편집 연결 중 30초, 조회 중 2분마다 갱신합니다. `새로고침`으로 즉시 확인할 수 있습니다. 실시간 동시 타이핑 도구는 아닙니다.
- 저장 시 최신 JSON 및 SHA를 읽어 변경분을 반영합니다. 같은 업무를 다른 사람이 먼저 수정했다면 덮어쓰지 않고 입력값을 보존하며 충돌을 안내합니다. 서로 다른 업무의 변경은 합쳐서 저장합니다.
- 저장마다 GitHub 커밋이 남습니다. 저장 완료는 GitHub API 성공 응답 이후에 표시됩니다.
- 공개 범위는 저장소 설정을 따릅니다. 공개 저장소에 저장한 내용은 누구나 읽을 수 있습니다. 보드 자체의 프로젝트별 비공개 설정은 제공하지 않습니다.

## 저장소에 반영

1. `projects` 폴더를 GA-HR 저장소 루트에 추가합니다. 기존 `index.html`은 유지합니다.
2. 기존 GitHub Pages 배포가 끝나면 `/GA-HR/projects/` 경로로 엽니다. Pages가 아직 켜져 있지 않다면 Settings → Pages에서 기본 브랜치의 루트를 설정합니다.
3. 공동 편집자는 저장소 Settings → Collaborators에서 접근 권한을 준비합니다.
4. 페이지의 `GitHub 편집 연결`로 토큰을 연결하고 새 프로젝트를 만듭니다.

실제 앱은 HTTP/HTTPS로 엽니다. 제공한 단일 HTML 미리보기는 더블클릭으로 샘플 체험할 수 있습니다.

## 검증

```
node --test projects/tests/*.test.mjs
node --check projects/app.mjs
node --check projects/github-store.mjs
```

핵심 날짜/상태 검증, 두 편집자 충돌, 서로 다른 업무 병합, SHA 재시도, 토큰 비저장과 조회 전용 쓰기 거부를 테스트합니다. 실제 저장소 쓰기는 GitHub 연결 후 별도 검증해야 합니다.

업무별 준비사항 50개, 추진 기록 200개, 프로젝트 기간 2년까지 지원합니다. 공용 데이터가 약 900KB를 넘으면 파일 분리가 필요합니다. 소규모 프로젝트 협업에 적합합니다.

구현 참고: https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents
