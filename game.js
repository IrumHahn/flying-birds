class Bird {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.velocity = 0;
        this.gravity = 0.05;
        this.jumpPower = -1.6;
        this.size = 20;
        this.color = '#FFD700';
    }

    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;

        // 화면 경계 확인
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
        // 송곳 모양에 닿으면 게임 오버되므로 여기서 멈추지 않음
        if (this.y > canvas.height - this.size) {
            this.y = canvas.height - this.size;
            this.velocity = 0;
        }
    }

    jump() {
        this.velocity = this.jumpPower;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        
        // 새 모양 만들기
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(this.x + 5, this.y + 5, 10, 10);
        
        // 날개
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(this.x - 5, this.y + 8, 8, 4);
        
        // 눈
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x + 12, this.y + 3, 2, 2);
    }
}

class Obstacle {
    constructor(x, y, width, height, type, speed = 2) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.speed = speed;
    }

    update() {
        this.x -= this.speed;
    }

    draw(ctx) {
        if (this.type === 'cloud') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // 구름 모양 만들기
            ctx.beginPath();
            ctx.arc(this.x + 15, this.y + 10, 12, 0, Math.PI * 2);
            ctx.arc(this.x + 35, this.y + 10, 16, 0, Math.PI * 2);
            ctx.arc(this.x + 55, this.y + 10, 12, 0, Math.PI * 2);
            ctx.arc(this.x + 25, this.y, 12, 0, Math.PI * 2);
            ctx.arc(this.x + 45, this.y, 12, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'bird') {
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // 적 새 모양
            ctx.fillStyle = '#A0522D';
            ctx.fillRect(this.x + 3, this.y + 3, this.width - 6, this.height - 6);
            
            // 날개
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(this.x - 3, this.y + 5, 6, 3);
        } else if (this.type === 'flock') {
            // 세때 그리기
            ctx.fillStyle = '#2F4F4F';
            for (let i = 0; i < 5; i++) {
                for (let j = 0; j < 3; j++) {
                    ctx.fillRect(this.x + i * 15, this.y + j * 15, 8, 8);
                }
            }
        } else if (this.type === 'lightning') {
            // 번개 그리기
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + 10, this.y + 20);
            ctx.lineTo(this.x - 5, this.y + 20);
            ctx.lineTo(this.x + 5, this.y + 40);
            ctx.stroke();
        }
    }

    collidesWith(bird) {
        return bird.x < this.x + this.width &&
               bird.x + bird.size > this.x &&
               bird.y < this.y + this.height &&
               bird.y + bird.size > this.y;
    }
}

class Game {
    constructor() {
        this.bird = new Bird(100, canvas.height / 2);
        this.obstacles = [];
        this.score = 100;
        this.gameStarted = false;
        this.gameOver = false;
        this.obstacleTimer = 0;
        this.spacePressed = false;
        this.keys = {};
        this.lastSecond = Math.floor(Date.now() / 1000);
        this.lastTenth = Math.floor(Date.now() / 100);
        this.gameStartTime = Date.now();
        this.gameSpeed = 1;
        this.eventTimer = 0;
        this.currentEvent = null;
        
        this.setupEventListeners();
        this.initAudio();
        this.loadHighScores();
        this.updateScoreboard();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.keys.space = true;
                
                if (!this.gameStarted) {
                    this.startGame();
                } else if (this.gameOver) {
                    document.getElementById('gameOverModal').style.display = 'none';
                    this.restartGame();
                } else {
                    this.bird.jump();
                    this.playJumpSound();
                    this.longJumpStartTime = Date.now();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                this.keys.space = false;
                // 긴 점프 소리 재생
                if (this.longJumpStartTime && Date.now() - this.longJumpStartTime > 200) {
                    this.playLongJumpSound();
                }
                this.longJumpStartTime = 0;
            }
        });
    }

    startGame() {
        this.gameStarted = true;
        this.gameStartTime = Date.now();
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('gameOverModal').style.display = 'none';
        this.playBackgroundMusic();
    }

    restartGame() {
        this.bird = new Bird(100, canvas.height / 2);
        this.obstacles = [];
        this.score = 100;
        this.gameOver = false;
        this.obstacleTimer = 0;
        this.gameStartTime = Date.now();
        this.gameSpeed = 1;
        this.eventTimer = 0;
        this.currentEvent = null;
        this.lastTenth = Math.floor(Date.now() / 100);
        document.getElementById('instructions').style.display = 'none';
        document.getElementById('gameOverModal').style.display = 'none';
        this.playBackgroundMusic();
    }

    spawnObstacle() {
        const types = ['cloud', 'bird'];
        const type = types[Math.floor(Math.random() * types.length)];
        const y = Math.random() * (canvas.height - 130);
        
        let width, height;
        if (type === 'cloud') {
            width = 70 + Math.random() * 20; // 더 다양한 크기
            height = 30 + Math.random() * 10;
        } else {
            width = 25 + Math.random() * 10;
            height = 15 + Math.random() * 5;
        }
        
        const speed = (2 + Math.random() * 1) * this.gameSpeed; // 속도에 랜덤 요소 추가
        this.obstacles.push(new Obstacle(canvas.width, y, width, height, type, speed));
    }

    spawnSpecialEvent() {
        const events = ['flock', 'lightning'];
        const event = events[Math.floor(Math.random() * events.length)];
        
        if (event === 'flock') {
            // 세때 발생 - 중간에 피할 공간 남기기
            for (let i = 0; i < 3; i++) {
                if (i === 1) continue; // 중간 비워둘기
                const y = (canvas.height / 4) * (i + 1) - 50;
                this.obstacles.push(new Obstacle(canvas.width, y, 75, 45, 'flock', 3 * this.gameSpeed));
            }
        } else if (event === 'lightning') {
            // 번개 발생 - 더 많이
            for (let i = 0; i < 7; i++) {
                const x = canvas.width + i * 80;
                const y = Math.random() * (canvas.height - 100);
                this.obstacles.push(new Obstacle(x, y, 15, 60, 'lightning', 4 * this.gameSpeed));
            }
        }
    }

    update() {
        if (!this.gameStarted || this.gameOver) return;

        // 게임 시간 및 속도 계산
        const gameTime = (Date.now() - this.gameStartTime) / 1000;
        this.gameSpeed = Math.pow(1.1, Math.floor(gameTime / 30)); // 30초마다 1.1배씩 속도 증가

        // 스페이스바가 눌려있으면 계속 점프
        if (this.keys.space) {
            this.bird.jump();
            // 긴 점프 소리 재생 (지연 시간 체크)
            if (this.longJumpStartTime && Date.now() - this.longJumpStartTime > 500 && !this.jumpSoundPlaying) {
                this.playLongJumpSound();
                this.longJumpStartTime = Date.now(); // 리셋으로 연속 재생 방지
            }
        }

        this.bird.update();
        
        // 송곳 모양과 충돌 검사
        if (this.bird.y > canvas.height - this.bird.size - 30) {
            this.gameOver = true;
            this.showGameOverModal();
        }

        // 장애물 생성 (난이도 증가)
        this.obstacleTimer++;
        const spawnRate = Math.max(30, 90 - Math.floor(gameTime / 5) * 5); // 5초마다 더 빠르게
        if (this.obstacleTimer > spawnRate) {
            this.spawnObstacle();
            this.obstacleTimer = 0;
            
            // 추가 장애물 생성 (시간이 지날수록 더 많이)
            if (gameTime > 30 && Math.random() < 0.3) {
                this.spawnObstacle();
            }
        }

        // 스페셜 이벤트 생성 (더 자주 발생)
        this.eventTimer++;
        const eventRate = Math.max(300, 600 - Math.floor(gameTime / 20) * 50); // 20초마다 더 자주
        if (this.eventTimer > eventRate && Math.random() < 0.05) { // 5% 확률로 증가
            this.spawnSpecialEvent();
            this.eventTimer = 0;
        }

        // 장애물 업데이트
        this.obstacles.forEach((obstacle, index) => {
            obstacle.update();
            
            // 충돌 검사
            if (obstacle.collidesWith(this.bird)) {
                this.gameOver = true;
                this.showGameOverModal();
            }
            
            // 화면 밖으로 나간 장애물 제거
            if (obstacle.x + obstacle.width < 0) {
                this.obstacles.splice(index, 1);
                this.score += 10;
            }
        });

        // 점수 업데이트 (0.1초단위로 1씩 증가)
        if (Math.floor(Date.now() / 100) !== this.lastTenth) {
            this.lastTenth = Math.floor(Date.now() / 100);
            this.score++;
        }
    }

    initAudio() {
        // Web Audio API를 이용한 오디오 생성
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.backgroundMusicPlaying = false;
            this.jumpSoundPlaying = false;
            this.longJumpStartTime = 0;
        } catch (e) {
            console.log('오디오 지원이 없습니다.');
            this.audioContext = null;
        }
    }

    createTone(frequency, duration, type = 'sine', volume = 0.1) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
        
        return oscillator;
    }

    playJumpSound() {
        if (!this.audioContext || this.jumpSoundPlaying) return;
        this.jumpSoundPlaying = true;
        
        this.createTone(440, 0.1, 'square', 0.05); // 점프 소리
        
        setTimeout(() => {
            this.jumpSoundPlaying = false;
        }, 50);
    }

    playLongJumpSound() {
        if (!this.audioContext) return;
        
        // 긴 점프 소리
        this.createTone(523, 0.3, 'sawtooth', 0.03);
    }

    playBackgroundMusic() {
        if (!this.audioContext || this.backgroundMusicPlaying) return;
        this.backgroundMusicPlaying = true;
        
        // 80년대 풍 배경음악 패턴
        const melody = [262, 294, 330, 349, 392, 440, 494, 523]; // C4-C5 스케일
        let noteIndex = 0;
        
        const playNote = () => {
            if (this.gameOver || !this.gameStarted) {
                this.backgroundMusicPlaying = false;
                return;
            }
            
            this.createTone(melody[noteIndex], 0.5, 'triangle', 0.02);
            noteIndex = (noteIndex + 1) % melody.length;
            
            setTimeout(playNote, 600);
        };
        
        playNote();
    }

    playGameOverSound() {
        if (!this.audioContext) return;
        
        // 안타까운 게임 오버 사운드 (내림차순 멜로디)
        const sadMelody = [523, 494, 440, 392, 349, 330, 294, 262]; // C5-C4 내림차순
        let noteIndex = 0;
        
        const playNote = () => {
            if (noteIndex >= sadMelody.length) return;
            
            this.createTone(sadMelody[noteIndex], 0.8, 'sine', 0.08);
            noteIndex++;
            
            setTimeout(playNote, 300);
        };
        
        playNote();
    }

    loadHighScores() {
        const saved = localStorage.getItem('birdGameHighScores');
        this.highScores = saved ? JSON.parse(saved) : [];
    }

    saveHighScores() {
        localStorage.setItem('birdGameHighScores', JSON.stringify(this.highScores));
    }

    updateScoreboard() {
        const scoreboardDiv = document.getElementById('highScores');
        if (this.highScores.length === 0) {
            scoreboardDiv.innerHTML = '<div style="text-align: center; color: #999;">아직 기록이 없습니다</div>';
            return;
        }
        
        let html = '';
        this.highScores.slice(0, 7).forEach((score, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            html += `<div class="score-item">
                <span>${medal} ${score.name}</span>
                <span>${score.score}</span>
            </div>`;
        });
        scoreboardDiv.innerHTML = html;
    }

    showGameOverModal() {
        this.playGameOverSound();
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverModal').style.display = 'flex';
        document.getElementById('playerName').focus();
    }

    saveScore() {
        const playerName = document.getElementById('playerName').value.trim();
        if (!playerName) {
            alert('이름을 입력해주세요!');
            return;
        }
        
        this.highScores.push({
            name: playerName,
            score: this.score,
            date: new Date().toLocaleDateString()
        });
        
        // 점수 순으로 정렬
        this.highScores.sort((a, b) => b.score - a.score);
        
        // 상위 7개만 유지
        this.highScores = this.highScores.slice(0, 7);
        
        this.saveHighScores();
        this.updateScoreboard();
        
        document.getElementById('gameOverModal').style.display = 'none';
        document.getElementById('playerName').value = '';
    }

    draw(ctx) {
        // 배경 그리기
        ctx.fillStyle = '#87CEEB';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 구름 배경
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 5; i++) {
            ctx.beginPath();
            ctx.arc(100 + i * 150, 50 + Math.sin(Date.now() * 0.001 + i) * 20, 30, 0, Math.PI * 2);
            ctx.fill();
        }

        // 화면 하단 송곳 모양 그리기
        ctx.fillStyle = '#654321';
        for (let i = 0; i < canvas.width; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, canvas.height);
            ctx.lineTo(i + 20, canvas.height - 30);
            ctx.lineTo(i + 40, canvas.height);
            ctx.fill();
        }

        this.bird.draw(ctx);
        
        this.obstacles.forEach(obstacle => {
            obstacle.draw(ctx);
        });

        // 점수 표시
        document.getElementById('score').textContent = this.score;

        // 게임 오버 메시지는 모달로 이동
    }
}

// 게임 초기화
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const game = new Game();

// 게임 루프
function gameLoop() {
    game.update();
    game.draw(ctx);
    requestAnimationFrame(gameLoop);
}

gameLoop();