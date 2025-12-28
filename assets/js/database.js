class Database {
    constructor() {
        this.dataPath = 'data/';
    }
    
    init() {
        // Создаем директорию данных, если её нет
        this.ensureDataDirectory();
        
        // Инициализируем файлы, если они не существуют
        if (!this.fileExists('users.json')) {
            this.createDefaultUsers();
        }
        if (!this.fileExists('teams.json')) {
            this.saveToFile('teams.json', []);
        }
        if (!this.fileExists('tournaments.json')) {
            this.saveToFile('tournaments.json', []);
        }
        if (!this.fileExists('matches.json')) {
            this.saveToFile('matches.json', []);
        }
        if (!this.fileExists('settings.json')) {
            this.saveToFile('settings.json', {
                maxTeamsPerUser: 1,
                defaultRating: 1000
            });
        }
    }
    
    ensureDataDirectory() {
        // В браузере мы не можем создавать директории,
        // но можем проверять наличие файлов
        // Для GitHub Pages файлы должны быть предварительно созданы
    }
    
    fileExists(filename) {
        // Пытаемся загрузить файл
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', this.dataPath + filename, false);
            xhr.send();
            return xhr.status === 200;
        } catch (e) {
            return false;
        }
    }
    
    createDefaultUsers() {
        const testUsers = [
            {
                id: 'admin_001',
                username: 'sasha',
                email: 'admin@tournament.com',
                password: '123', // Внимание: в реальном приложении пароль должен быть хеширован!
                nickname: 'Администратор',
                role: 'admin',
                createdAt: new Date().toISOString(),
                isVerified: true,
                hasTeam: false,
                teamId: null
            }
        ];
        
        this.saveToFile('users.json', testUsers);
    }
    
    saveToFile(filename, data) {
        // В браузере мы не можем сохранять файлы напрямую,
        // поэтому используем localStorage как кэш
        const key = 'db_' + filename;
        localStorage.setItem(key, JSON.stringify(data));
        
        // Также пытаемся сохранить через AJAX (для GitHub Pages это не сработает,
        // но оставляем для полноты кода)
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', 'save.php', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({
                filename: filename,
                data: data
            }));
        } catch (e) {
            // Игнорируем ошибки для статического хостинга
        }
    }
    
    loadFromFile(filename) {
        // Сначала пробуем загрузить из localStorage
        const key = 'db_' + filename;
        const cached = localStorage.getItem(key);
        
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                console.error('Error parsing cached data:', e);
            }
        }
        
        // Если нет в кэше, пробуем загрузить с сервера
        try {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', this.dataPath + filename, false);
            xhr.send();
            
            if (xhr.status === 200) {
                const data = JSON.parse(xhr.responseText);
                // Кэшируем в localStorage
                localStorage.setItem(key, xhr.responseText);
                return data;
            }
        } catch (e) {
            console.error('Error loading file:', e);
        }
        
        // Если файл не найден, возвращаем пустой массив/объект
        return filename.includes('.json') ? (filename === 'settings.json' ? {} : []) : null;
    }
    
    // Пользователи
    getAllUsers() {
        return this.loadFromFile('users.json');
    }
    
    getUserById(id) {
        const users = this.getAllUsers();
        return users.find(user => user.id === id);
    }
    
    getUserByUsername(username) {
        const users = this.getAllUsers();
        return users.find(user => user.username === username);
    }
    
    createUser(userData) {
        const users = this.getAllUsers();
        
        const newUser = {
            id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            username: userData.username,
            email: userData.email,
            password: userData.password, // Внимание: в реальном приложении пароль должен быть хеширован!
            nickname: userData.nickname || userData.username,
            role: 'user',
            createdAt: new Date().toISOString(),
            isVerified: false,
            hasTeam: false,
            teamId: null
        };
        
        users.push(newUser);
        this.saveToFile('users.json', users);
        
        return newUser;
    }
    
    updateUser(userId, updates) {
        const users = this.getAllUsers();
        const index = users.findIndex(user => user.id === userId);
        
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            this.saveToFile('users.json', users);
            return users[index];
        }
        
        return null;
    }
    
    // Команды
    getAllTeams() {
        return this.loadFromFile('teams.json');
    }
    
    getTeamById(id) {
        const teams = this.getAllTeams();
        return teams.find(team => team.id === id);
    }
    
    getTeamsByGame(game) {
        const teams = this.getAllTeams();
        return teams.filter(team => team.game === game);
    }
    
    createTeam(teamData) {
        const teams = this.getAllTeams();
        const users = this.getAllUsers();
        
        const user = users.find(u => u.id === teamData.captainId);
        
        if (user && user.role !== 'admin' && user.hasTeam) {
            throw new Error('У вас уже есть команда. Удалите текущую, чтобы создать новую.');
        }
        
        const newTeam = {
            id: 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: teamData.name,
            tag: teamData.tag || '',
            game: teamData.game,
            captainId: teamData.captainId,
            players: teamData.players || [],
            rating: 1000,
            wins: 0,
            losses: 0,
            draws: 0,
            status: 'active',
            createdAt: new Date().toISOString()
        };
        
        teams.push(newTeam);
        this.saveToFile('teams.json', teams);
        
        // Обновляем пользователя
        if (user && user.role !== 'admin') {
            this.updateUser(teamData.captainId, {
                hasTeam: true,
                teamId: newTeam.id
            });
        }
        
        return newTeam;
    }
    
    updateTeam(teamId, updates) {
        const teams = this.getAllTeams();
        const index = teams.findIndex(team => team.id === teamId);
        
        if (index !== -1) {
            teams[index] = { ...teams[index], ...updates };
            this.saveToFile('teams.json', teams);
            return teams[index];
        }
        
        return null;
    }
    
    deleteTeam(teamId) {
        const teams = this.getAllTeams();
        const users = this.getAllUsers();
        
        const teamIndex = teams.findIndex(team => team.id === teamId);
        
        if (teamIndex === -1) return false;
        
        const team = teams[teamIndex];
        teams.splice(teamIndex, 1);
        this.saveToFile('teams.json', teams);
        
        // Обновляем пользователя
        if (team) {
            const userIndex = users.findIndex(u => u.id === team.captainId);
            if (userIndex !== -1 && users[userIndex].role !== 'admin') {
                users[userIndex].hasTeam = false;
                users[userIndex].teamId = null;
                this.saveToFile('users.json', users);
            }
        }
        
        return true;
    }
    
    forceDeleteTeam(teamId) {
        const teams = this.getAllTeams();
        const filtered = teams.filter(team => team.id !== teamId);
        this.saveToFile('teams.json', filtered);
        return true;
    }
    
    // Турниры
    getAllTournaments() {
        return this.loadFromFile('tournaments.json');
    }
    
    getTournamentById(id) {
        const tournaments = this.getAllTournaments();
        return tournaments.find(tournament => tournament.id === id);
    }
    
    getTournamentFull(tournamentId) {
        const tournament = this.getTournamentById(tournamentId);
        if (!tournament) return null;
        
        const teams = this.getAllTeams();
        const matches = this.getAllMatches();
        
        const tournamentTeams = tournament.teams.map(teamId => 
            teams.find(team => team.id === teamId)
        ).filter(team => team !== undefined);
        
        const tournamentMatches = matches.filter(match => 
            match.tournamentId === tournamentId
        ).sort((a, b) => {
            return a.round - b.round || a.matchNumber - b.matchNumber;
        });
        
        let winner = null;
        if (tournament.winnerTeamId) {
            winner = this.getTeamById(tournament.winnerTeamId);
        }
        
        return {
            ...tournament,
            teams: tournamentTeams,
            matches: tournamentMatches,
            winner: winner
        };
    }
    
    createTournament(tournamentData) {
        const tournaments = this.getAllTournaments();
        
        const newTournament = {
            id: 'tournament_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: tournamentData.name,
            game: tournamentData.game,
            creatorId: tournamentData.creatorId,
            description: tournamentData.description || '',
            status: 'upcoming',
            format: tournamentData.format,
            matchType: tournamentData.matchType,
            teams: tournamentData.teams || [],
            currentRound: 1,
            maxTeams: tournamentData.maxTeams || 16,
            prizePool: tournamentData.prizePool || 0,
            startDate: tournamentData.startDate || new Date().toISOString().split('T')[0],
            endDate: tournamentData.endDate || null,
            createdAt: new Date().toISOString()
        };
        
        tournaments.push(newTournament);
        this.saveToFile('tournaments.json', tournaments);
        
        return newTournament;
    }
    
    updateTournament(tournamentId, updates) {
        const tournaments = this.getAllTournaments();
        const index = tournaments.findIndex(t => t.id === tournamentId);
        
        if (index !== -1) {
            tournaments[index] = { ...tournaments[index], ...updates };
            this.saveToFile('tournaments.json', tournaments);
            return tournaments[index];
        }
        
        return null;
    }
    
    forceDeleteTournament(tournamentId) {
        const tournaments = this.getAllTournaments();
        const matches = this.getAllMatches();
        
        const filteredTournaments = tournaments.filter(t => t.id !== tournamentId);
        const filteredMatches = matches.filter(m => m.tournamentId !== tournamentId);
        
        this.saveToFile('tournaments.json', filteredTournaments);
        this.saveToFile('matches.json', filteredMatches);
        
        return true;
    }
    
    generateTournamentBracket(tournamentId, teams) {
        const tournament = this.getTournamentById(tournamentId);
        if (!tournament) return [];
        
        const matches = this.getAllMatches();
        const newMatches = [];
        
        for (let i = 0; i < teams.length; i += 2) {
            if (i + 1 < teams.length) {
                const bestOf = tournament.matchType === 'bo1' ? 1 : 
                             tournament.matchType === 'bo3' ? 3 : 5;
                
                const match = {
                    id: 'match_' + Date.now() + '_' + i,
                    tournamentId: tournamentId,
                    round: 1,
                    matchNumber: (i / 2) + 1,
                    team1Id: teams[i].id,
                    team2Id: teams[i + 1].id,
                    team1: teams[i],
                    team2: teams[i + 1],
                    score1: 0,
                    score2: 0,
                    status: 'upcoming',
                    bestOf: bestOf,
                    date: null,
                    createdAt: new Date().toISOString()
                };
                
                newMatches.push(match);
                matches.push(match);
            }
        }
        
        this.saveToFile('matches.json', matches);
        return newMatches;
    }
    
    // Матчи
    getAllMatches() {
        return this.loadFromFile('matches.json');
    }
    
    createMatch(matchData) {
        const matches = this.getAllMatches();
        
        const newMatch = {
            id: 'match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            tournamentId: matchData.tournamentId,
            round: matchData.round,
            matchNumber: matchData.matchNumber || 1,
            team1Id: matchData.team1Id,
            team2Id: matchData.team2Id,
            team1: matchData.team1,
            team2: matchData.team2,
            score1: matchData.score1 || 0,
            score2: matchData.score2 || 0,
            status: 'upcoming',
            bestOf: matchData.bestOf || 3,
            date: matchData.date || null,
            duration: matchData.duration || null,
            mapResults: matchData.mapResults || [],
            createdAt: new Date().toISOString()
        };
        
        matches.push(newMatch);
        this.saveToFile('matches.json', matches);
        
        return newMatch;
    }
    
    updateMatch(matchId, updates) {
        const matches = this.getAllMatches();
        const index = matches.findIndex(m => m.id === matchId);
        
        if (index !== -1) {
            matches[index] = { ...matches[index], ...updates };
            this.saveToFile('matches.json', matches);
            
            if (updates.status === 'finished') {
                this.updateTeamStats(matches[index]);
            }
            
            return matches[index];
        }
        
        return null;
    }
    
    updateTeamStats(match) {
        if (match.status !== 'finished') return;
        
        const teams = this.getAllTeams();
        let team1Index = -1;
        let team2Index = -1;
        
        for (let i = 0; i < teams.length; i++) {
            if (teams[i].id === match.team1Id) team1Index = i;
            if (teams[i].id === match.team2Id) team2Index = i;
        }
        
        if (team1Index !== -1 && team2Index !== -1) {
            if (match.score1 > match.score2) {
                // Команда 1 победила
                teams[team1Index].wins = (teams[team1Index].wins || 0) + 1;
                teams[team2Index].losses = (teams[team2Index].losses || 0) + 1;
                teams[team1Index].rating = (teams[team1Index].rating || 1000) + 25;
                teams[team2Index].rating = Math.max(0, (teams[team2Index].rating || 1000) - 15);
            } else if (match.score2 > match.score1) {
                // Команда 2 победила
                teams[team2Index].wins = (teams[team2Index].wins || 0) + 1;
                teams[team1Index].losses = (teams[team1Index].losses || 0) + 1;
                teams[team2Index].rating = (teams[team2Index].rating || 1000) + 25;
                teams[team1Index].rating = Math.max(0, (teams[team1Index].rating || 1000) - 15);
            }
            
            this.saveToFile('teams.json', teams);
        }
    }
    
    // Административные функции
    promoteToAdmin(userId) {
        return this.updateUser(userId, { role: 'admin' });
    }
    
    demoteFromAdmin(userId) {
        return this.updateUser(userId, { role: 'user' });
    }
    
    // Настройки
    getSettings() {
        return this.loadFromFile('settings.json');
    }
    
    saveSettings(settings) {
        this.saveToFile('settings.json', settings);
    }
}

// Экспортируем для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Database;
}