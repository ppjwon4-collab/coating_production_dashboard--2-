/**
 * 코팅 설비 데이터 분석 대시보드 엔진
 * (자바스크립트 초급자용 상세 주석 탑재 버전)
 */

// DOM 요소 취득 및 바인딩
const fileInput = document.getElementById('csvFileInput');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const totalRollsEl = document.getElementById('totalRolls');
const errorRateEl = document.getElementById('errorRate');
const operationRateEl = document.getElementById('operationRate');
const totalLossTimeEl = document.getElementById('totalLossTime');

const ngSummarySection = document.getElementById('ngSummarySection');
const ngTableBody = document.getElementById('ngTableBody');
const mainTableBody = document.getElementById('mainTableBody');

const facilityChartEl = document.getElementById('facilityChart');
const modelChartEl = document.getElementById('modelChart');
const dateChartEl = document.getElementById('dateChart');
const lossChartEl = document.getElementById('lossChart');

// 1. 파일 선택 컴포넌트 이벤트 리스너 핸들러 연동
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // 파일 이름 뷰어 갱신
    fileNameDisplay.textContent = file.name;

    // 한글 깨짐 문제를 해결하기 위한 내장 FileReader 가동
    const reader = new FileReader();

    // 대한민국 제조 현장 Excel 전용 인코딩 타입(EUC-KR / CP949) 방어 가이드 지정
    reader.readAsText(file, 'EUC-KR');

    // 파일 로드가 완수된 시점의 가공 파이프라인
    reader.onload = function(event) {
        const text = event.target.result;
        processData(text); // CSV 문자열 해체 및 집계 연산 시작
    };
});

// 2. 파일 텍스트 원시 데이터를 로우 데이터 객체 배열로 변환하는 파서 엔진
function processData(csvText) {
    // 줄바꿈 기호를 분할하여 배열화 처리
    const lines = csvText.split(/\r?\n/);
    if (lines.length === 0) return;

    // 첫 번째 줄(헤더 컬럼 이름행) 추출
    const headers = lines[0].split(',').map(h => h.trim());
    
    // 유효 데이터 레코드 적재용 저장소
    const records = [];

    // 두 번째 라인부터 순회하며 개별 데이터 복원 및 객체화
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue; // 빈 행 무시
        
        const values = lines[i].split(',');
        const record = {};
        
        headers.forEach((header, index) => {
            record[header] = values[index] ? values[index].trim() : '';
        });
        
        records.push(record);
    }

    // 렌더링 파이프라인 가동
    renderDashboard(records);
}

// 3. 수식 연산 및 각 레이아웃 영역 컴포넌트 채우기 총괄 함수
function renderDashboard(data) {
    // 기초 연산용 변수 초기화
    let totalRolls = data.length;
    let ngCount = 0;
    let totalProductionTime = 0;
    let totalLossTime = 0;

    // 차트 집계 분석용 맵 객체 브릿지 정의
    const facilityMap = {};
    const modelMap = {};
    const dateMap = {};
    const facilityLossMap = {};

    // 데이터 로우별 1차 순회 및 연산 누적
    data.forEach(row => {
        // 불량 카운트 판정
        if (row['판정'] === 'NG') {
            ngCount++;
        }

        // 수치 변환 (정수/실수 형변환 처리 및 예외 복조)
        const prodTime = parseFloat(row['생산시간_분']) || 0;
        const lossTime = parseFloat(row['로스시간_분']) || 0;

        totalProductionTime += prodTime;
        totalLossTime += lossTime;

        // 설비별 생산 롤 수 누적
        const facility = row['설비명'] || '미지정';
        facilityMap[facility] = (facilityMap[facility] || 0) + 1;

        // 생산모델별 생산 롤 수 누적
        const model = row['생산모델'] || '미지정';
        modelMap[model] = (modelMap[model] || 0) + 1;

        // 일자별 생산 롤 수 누적
        const date = row['생산일자'] || '날짜누락';
        dateMap[date] = (dateMap[date] || 0) + 1;

        // 설비별 누적 로스 시간 적재
        facilityLossMap[facility] = (facilityLossMap[facility] || 0) + lossTime;
    });

    // --- [수식 연산 파트] ---
    // 불량률 = (NG 수 / 총 롤 수) * 100
    const errorRate = totalRolls > 0 ? (ngCount / totalRolls) * 100 : 0;
    // 가동률 = 생산시간 합계 / (생산시간 합계 + 로스시간 합계) * 100
    const timeDenom = totalProductionTime + totalLossTime;
    const operationRate = timeDenom > 0 ? (totalProductionTime / timeDenom) * 100 : 0;

    // 요약 카드 텍스트 노드 출력 (.toFixed(1) 제약 조건 반영)
    totalRollsEl.textContent = `${totalRolls} 롤`;
    errorRateEl.textContent = `${errorRate.toFixed(1)}%`;
    operationRateEl.textContent = `${operationRate.toFixed(1)}%`;
    totalLossTimeEl.textContent = `${totalLossTime.toFixed(1)} 분`;

    // --- [차트 데이터 정렬 및 렌더링 파트] ---
    // 가. 설비별 생산 롤 수 (많은순 정렬)
    const sortedFacility = Object.entries(facilityMap).sort((a, b) => b[1] - a[1]);
    drawHorizontalBarChart(facilityChartEl, sortedFacility, '롤');

    // 나. 생산모델별 생산 롤 수 (많은순 정렬)
    const sortedModel = Object.entries(modelMap).sort((a, b) => b[1] - a[1]);
    drawHorizontalBarChart(modelChartEl, sortedModel, '롤');

    // 다. 일자별 생산 롤 수 (날짜 오름차순 정렬)
    const sortedDate = Object.entries(dateMap).sort((a, b) => a[0].localeCompare(b[0]));
    drawHorizontalBarChart(dateChartEl, sortedDate, '롤');

    // 라. 설비별 로스 시간 변화량 (많은순 정렬)
    const sortedLoss = Object.entries(facilityLossMap).sort((a, b) => b[1] - a[1]);
    drawHorizontalBarChart(lossChartEl, sortedLoss, '분');

    // --- [테이블 및 상단 NG 표 데이터 구성] ---
    let mainTableHtml = '';
    let ngTableHtml = '';
    let hasNg = false;

    data.forEach(row => {
        const isNg = row['판정'] === 'NG';
        const badgeClass = isNg ? 'badge-ng' : 'badge-ok';
        const rowClass = isNg ? 'class="row-ng"' : '';

        // 범용 행 마크업 스트링 빌더
        const rowHtml = `
            <tr ${rowClass}>
                <td>${row['생산일자'] || ''}</td>
                <td><strong>${row['설비명'] || ''}</strong></td>
                <td>${row['MES_NO'] || ''}</td>
                <td>${row['생산모델'] || ''}</td>
                <td>${row['두께_좌'] || ''} / ${row['두께_중'] || ''} / ${row['두께_우'] || ''}</td>
                <td>${row['무게'] || ''}</td>
                <td>${row['통기도'] || ''}</td>
                <td>${row['인장강도'] || ''}</td>
                <td>${row['생산시간_분'] || '0'}</td>
                <td>${row['로스시간_분'] || '0'}</td>
                <td><span class="${badgeClass}">${row['판정'] || ''}</span></td>
            </tr>
        `;

        mainTableHtml += rowHtml;

        // 불량 항목인 경우 상단 집계판용 문자열에 추가 연동
        if (isNg) {
            hasNg = true;
            ngTableHtml += `
                <tr class="row-ng">
                    <td>${row['생산일자'] || ''}</td>
                    <td><strong>${row['설비명'] || ''}</strong></td>
                    <td>${row['MES_NO'] || ''}</td>
                    <td>${row['생산모델'] || ''}</td>
                    <td>${row['두께_좌'] || ''} / ${row['두께_중'] || ''} / ${row['두께_우'] || ''}</td>
                    <td>${row['무게'] || ''}</td>
                    <td>${row['통기도'] || ''}</td>
                    <td>${row['인장강도'] || ''}</td>
                    <td><strong>${row['로스시간_분'] || '0'} 분</strong></td>
                </tr>
            `;
        }
    });

    // 메인 테이블 출력 업데이트
    mainTableBody.innerHTML = mainTableHtml;

    // 상단 NG 요약 컴포넌트 노출 스위칭 제어
    if (hasNg) {
        ngTableBody.innerHTML = ngTableHtml;
        ngSummarySection.style.display = 'block';
    } else {
        ngSummarySection.style.display = 'none';
    }
}

// 4. 순수 div 너비 퍼센트 제어를 통한 반응형 가로 막대 그래프 렌더러 함수
function drawHorizontalBarChart(containerElement, sortedDataArray, unitString) {
    containerElement.innerHTML = ''; // 기존 컴포넌트 초기화

    if (sortedDataArray.length === 0) {
        containerElement.innerHTML = '<p class="empty-msg">데이터가 없습니다.</p>';
        return;
    }

    // 비율 역산을 위해 배열 내 최대 밸류값 서치
    const maxVal = Math.max(...sortedDataArray.map(item => item[1]));

    // 동적 DOM 노드 주입 루프
    sortedDataArray.forEach(([labelName, dataValue]) => {
        // 스케일 비율 계산 (최대치 대비 퍼센트) -> 분모가 0이 되는 것을 방지
        const pct = maxVal > 0 ? (dataValue / maxVal) * 100 : 0;

        const rowDiv = document.createElement('div');
        rowDiv.className = 'chart-row';

        rowDiv.innerHTML = `
            <div class="chart-label" title="${labelName}">${labelName}</div>
            <div class="chart-track">
                <div class="chart-bar" style="width: ${pct}%;"></div>
                <div class="chart-value">${dataValue.toFixed(1)}${unitString}</div>
            </div>
        `;
        containerElement.appendChild(rowDiv);
    });
}
