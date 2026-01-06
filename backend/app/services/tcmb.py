"""
TCMB (Türkiye Cumhuriyet Merkez Bankası) Döviz Kuru Servisi
"""
import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, date
from typing import Optional, Dict, List
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

class TCMBService:
    """TCMB Döviz Kuru API Servisi"""
    
    # TCMB XML API URL
    BASE_URL = "https://www.tcmb.gov.tr/kurlar"
    TODAY_URL = "https://www.tcmb.gov.tr/kurlar/today.xml"
    
    # Desteklenen para birimleri
    SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "CHF", "JPY", "SAR", "AUD", "CAD", "DKK", "NOK", "SEK", "RUB"]
    
    @classmethod
    async def fetch_today_rates(cls) -> Optional[Dict]:
        """Bugünkü kurları çek"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(cls.TODAY_URL)
                
                if response.status_code != 200:
                    logger.error(f"TCMB API error: {response.status_code}")
                    return None
                
                return cls._parse_tcmb_xml(response.text)
                
        except Exception as e:
            logger.error(f"TCMB fetch error: {e}")
            return None
    
    @classmethod
    async def fetch_rates_by_date(cls, rate_date: date) -> Optional[Dict]:
        """Belirli tarihteki kurları çek"""
        try:
            # TCMB URL formatı: /YYYYMM/DDMMYYYY.xml
            url = f"{cls.BASE_URL}/{rate_date.strftime('%Y%m')}/{rate_date.strftime('%d%m%Y')}.xml"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url)
                
                if response.status_code != 200:
                    logger.error(f"TCMB API error for date {rate_date}: {response.status_code}")
                    return None
                
                return cls._parse_tcmb_xml(response.text)
                
        except Exception as e:
            logger.error(f"TCMB fetch error for date {rate_date}: {e}")
            return None
    
    @classmethod
    def _parse_tcmb_xml(cls, xml_content: str) -> Dict:
        """TCMB XML'ini parse et"""
        rates = {
            "date": None,
            "currencies": {}
        }
        
        try:
            root = ET.fromstring(xml_content)
            
            # Tarih bilgisi
            date_attr = root.get("Date")
            if date_attr:
                rates["date"] = datetime.strptime(date_attr, "%m/%d/%Y").date()
            
            # Her para birimi için kurları al
            for currency in root.findall("Currency"):
                code = currency.get("CurrencyCode")
                if not code:
                    continue
                
                # Döviz alış (ForexBuying)
                forex_buying = currency.find("ForexBuying")
                buying_rate = Decimal(forex_buying.text) if forex_buying is not None and forex_buying.text else None
                
                # Döviz satış (ForexSelling)
                forex_selling = currency.find("ForexSelling")
                selling_rate = Decimal(forex_selling.text) if forex_selling is not None and forex_selling.text else None
                
                # Efektif alış
                banknote_buying = currency.find("BanknoteBuying")
                eff_buying = Decimal(banknote_buying.text) if banknote_buying is not None and banknote_buying.text else None
                
                # Efektif satış
                banknote_selling = currency.find("BanknoteSelling")
                eff_selling = Decimal(banknote_selling.text) if banknote_selling is not None and banknote_selling.text else None
                
                # Para birimi adı
                currency_name = currency.find("CurrencyName")
                name = currency_name.text if currency_name is not None else code
                
                # Birim (Unit) - bazı para birimleri 100 birim üzerinden
                unit_elem = currency.find("Unit")
                unit = int(unit_elem.text) if unit_elem is not None and unit_elem.text else 1
                
                if buying_rate or selling_rate:
                    rates["currencies"][code] = {
                        "name": name,
                        "unit": unit,
                        "forex_buying": float(buying_rate) if buying_rate else None,
                        "forex_selling": float(selling_rate) if selling_rate else None,
                        "banknote_buying": float(eff_buying) if eff_buying else None,
                        "banknote_selling": float(eff_selling) if eff_selling else None,
                    }
            
            return rates
            
        except ET.ParseError as e:
            logger.error(f"XML parse error: {e}")
            return rates
    
    @classmethod
    def convert(cls, amount: Decimal, from_currency: str, to_currency: str, rates: Dict) -> Optional[Decimal]:
        """Para birimi dönüşümü yap"""
        if from_currency == to_currency:
            return amount
        
        currencies = rates.get("currencies", {})
        
        # TRY'den başka bir para birimine
        if from_currency == "TRY":
            if to_currency in currencies:
                rate = currencies[to_currency].get("forex_selling")
                unit = currencies[to_currency].get("unit", 1)
                if rate:
                    return (amount / Decimal(str(rate))) * unit
        
        # Başka bir para biriminden TRY'ye
        elif to_currency == "TRY":
            if from_currency in currencies:
                rate = currencies[from_currency].get("forex_buying")
                unit = currencies[from_currency].get("unit", 1)
                if rate:
                    return (amount * Decimal(str(rate))) / unit
        
        # İki yabancı para birimi arası (TRY üzerinden çapraz kur)
        else:
            # Önce TRY'ye çevir, sonra hedef para birimine
            try_amount = cls.convert(amount, from_currency, "TRY", rates)
            if try_amount:
                return cls.convert(try_amount, "TRY", to_currency, rates)
        
        return None
    
    @classmethod
    def get_rate_to_try(cls, currency: str, rates: Dict) -> Optional[float]:
        """Bir para biriminin TRY karşılığını al (döviz alış)"""
        if currency == "TRY":
            return 1.0
        
        currencies = rates.get("currencies", {})
        if currency in currencies:
            rate = currencies[currency].get("forex_buying")
            unit = currencies[currency].get("unit", 1)
            if rate:
                return rate / unit
        
        return None


# Kripto para kurları için ayrı servis (opsiyonel)
class CryptoRateService:
    """Kripto para kuru servisi (USDT vb.)"""
    
    # CoinGecko ücretsiz API
    COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price"
    
    @classmethod
    async def fetch_usdt_rate(cls) -> Optional[Dict]:
        """USDT/TRY kurunu çek"""
        try:
            params = {
                "ids": "tether",
                "vs_currencies": "try,usd,eur"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(cls.COINGECKO_URL, params=params)
                
                if response.status_code != 200:
                    logger.error(f"CoinGecko API error: {response.status_code}")
                    return None
                
                data = response.json()
                tether = data.get("tether", {})
                
                return {
                    "USDT": {
                        "TRY": tether.get("try"),
                        "USD": tether.get("usd"),
                        "EUR": tether.get("eur")
                    }
                }
                
        except Exception as e:
            logger.error(f"CoinGecko fetch error: {e}")
            return None

