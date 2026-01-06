#!/bin/bash
# NOX ERP - Otomatik Başlatma Scripti
# Çift tıklayarak çalıştırabilirsiniz

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════╗"
echo "║           NOX ERP v1.0.0              ║"
echo "║     Kurumsal Kaynak Planlama          ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Proje dizinine git
cd "$(dirname "$0")"
PROJECT_DIR=$(pwd)

echo -e "${YELLOW}📂 Proje dizini: ${PROJECT_DIR}${NC}"

# Portları temizle
echo -e "\n${YELLOW}🔄 Mevcut portlar temizleniyor...${NC}"

# Backend port (8000)
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}Port 8000 kullanımda, kapatılıyor...${NC}"
    kill -9 $(lsof -t -i:8000) 2>/dev/null
    sleep 1
fi

# Frontend port (5173)
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}Port 5173 kullanımda, kapatılıyor...${NC}"
    kill -9 $(lsof -t -i:5173) 2>/dev/null
    sleep 1
fi

echo -e "${GREEN}✅ Portlar temiz${NC}"

# Python virtual environment kontrolü
echo -e "\n${YELLOW}🐍 Python ortamı hazırlanıyor...${NC}"

cd backend

# Virtual environment yoksa oluştur
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Virtual environment oluşturuluyor...${NC}"
    python3 -m venv venv
fi

# Aktifleştir
source venv/bin/activate

# Bağımlılıkları yükle
echo -e "${YELLOW}📦 Backend bağımlılıkları yükleniyor...${NC}"
pip install -q -r requirements.txt

# Backend'i başlat
echo -e "\n${GREEN}🚀 Backend başlatılıyor (port 8000)...${NC}"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

cd ..

# Frontend
echo -e "\n${YELLOW}📦 Frontend hazırlanıyor...${NC}"
cd frontend

# node_modules yoksa yükle
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Node modülleri yükleniyor...${NC}"
    npm install
fi

# Frontend'i başlat
echo -e "\n${GREEN}🚀 Frontend başlatılıyor (port 5173)...${NC}"
npm run dev &
FRONTEND_PID=$!

cd ..

# Bekle ve tarayıcıyı aç
echo -e "\n${YELLOW}⏳ Servisler başlatılıyor, lütfen bekleyin...${NC}"
sleep 5

# Tarayıcıyı aç
echo -e "\n${GREEN}🌐 Tarayıcı açılıyor...${NC}"
open "http://localhost:5173"

echo -e "\n${CYAN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ NOX ERP başlatıldı!${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo ""
echo -e "Frontend:  ${GREEN}http://localhost:5173${NC}"
echo -e "Backend:   ${GREEN}http://localhost:8000${NC}"
echo -e "API Docs:  ${GREEN}http://localhost:8000/docs${NC}"
echo ""
echo -e "${YELLOW}Demo Kullanıcılar:${NC}"
echo -e "  admin / admin123       (Süper Admin)"
echo -e "  muhasebe / muhasebe123 (Muhasebe)"
echo -e "  satis / satis123       (Satış)"
echo -e "  viewer / viewer123     (Görüntüleyici)"
echo ""
echo -e "${RED}Kapatmak için bu pencereyi kapatın veya Ctrl+C${NC}"
echo ""

# Süreçleri bekle
wait

