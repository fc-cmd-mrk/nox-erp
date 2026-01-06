"""
VKN/TC Kimlik Sorgulama Servisi
GİB (Gelir İdaresi Başkanlığı) üzerinden vergi kimlik numarası sorgulama
"""
import httpx
from typing import Optional
import re


async def query_tax_info(tax_number: str) -> dict:
    """
    VKN (Vergi Kimlik Numarası) veya TC Kimlik Numarası ile firma bilgilerini sorgular
    
    GİB'in https://ivd.gib.gov.tr/tvd_side/main.jsp servisi kullanılır
    """
    
    # Sadece rakamları al
    tax_number = re.sub(r'\D', '', tax_number)
    
    if len(tax_number) == 10:
        # VKN - Vergi Kimlik Numarası (Tüzel Kişi)
        query_type = "VKN"
    elif len(tax_number) == 11:
        # TC Kimlik Numarası (Gerçek Kişi)
        query_type = "TCKN"
    else:
        return {
            "success": False,
            "error": "Geçersiz numara uzunluğu. VKN 10 hane, TCKN 11 hane olmalıdır."
        }
    
    try:
        # GİB interaktif vergi dairesi sorgu URL
        url = "https://ivd.gib.gov.tr/tvd_server/asynchronousServices"
        
        # SOAP benzeri istek yapısı
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Origin": "https://ivd.gib.gov.tr",
            "Referer": "https://ivd.gib.gov.tr/tvd_side/main.jsp?token=d51b47f0b6c7aee462aba7c64c54d252cf6f3d92d3c18ea3e089e1bf457a1949"
        }
        
        # GİB'in beklediği form verisi
        if query_type == "VKN":
            data = {
                "cmd": "vergiNoSor662",
                "callid": "1",
                "pageName": "V.MUK.MAIN",
                "token": "",
                "jp": f'{{"doession":true,"vergiNo":"{tax_number}"}}'
            }
        else:
            data = {
                "cmd": "vergiNoSorgu",
                "callid": "1", 
                "pageName": "V.MUK.MAIN",
                "token": "",
                "jp": f'{{"doession":true,"tckn":"{tax_number}"}}'
            }
        
        async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
            response = await client.post(url, data=data, headers=headers)
            
            if response.status_code == 200:
                result = response.json()
                
                # GİB sonuç formatı
                if isinstance(result, dict) and "unvan" in result:
                    return {
                        "success": True,
                        "query_type": query_type,
                        "tax_number": tax_number,
                        "company_name": result.get("unvan", ""),
                        "tax_office": result.get("vdAdi", ""),
                        "city": result.get("ilAdi", ""),
                        "district": result.get("ilceAdi", ""),
                        "status": result.get("durum", "")
                    }
                    
                # Alternatif format kontrolü
                if isinstance(result, list) and len(result) > 0:
                    item = result[0]
                    return {
                        "success": True,
                        "query_type": query_type,
                        "tax_number": tax_number,
                        "company_name": item.get("unvan") or item.get("adi", ""),
                        "tax_office": item.get("vdAdi") or item.get("vergidairesiadi", ""),
                        "city": item.get("ilAdi") or item.get("il", ""),
                        "district": item.get("ilceAdi") or item.get("ilce", ""),
                        "status": item.get("durum", "Aktif")
                    }
                    
                return {
                    "success": False,
                    "error": "Sorgulama sonucu boş döndü",
                    "raw_response": result
                }
            else:
                return {
                    "success": False,
                    "error": f"GİB sunucusu yanıt vermedi: {response.status_code}"
                }
                
    except httpx.TimeoutException:
        return {
            "success": False,
            "error": "GİB sunucusu zaman aşımına uğradı. Lütfen tekrar deneyin."
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Sorgu hatası: {str(e)}"
        }


async def query_tax_office_list() -> list:
    """Vergi dairesi listesini getirir"""
    # Sabit liste - Türkiye'deki başlıca vergi daireleri
    return [
        {"code": "034252", "name": "KADIKÖY VERGİ DAİRESİ", "city": "İSTANBUL"},
        {"code": "034254", "name": "ÜSKÜDAR VERGİ DAİRESİ", "city": "İSTANBUL"},
        {"code": "034256", "name": "BEŞİKTAŞ VERGİ DAİRESİ", "city": "İSTANBUL"},
        {"code": "006001", "name": "ÇANKAYA VERGİ DAİRESİ", "city": "ANKARA"},
        {"code": "035001", "name": "KONAK VERGİ DAİRESİ", "city": "İZMİR"},
        # Daha fazla eklenebilir
    ]


def validate_vkn(vkn: str) -> bool:
    """VKN doğrulama algoritması (10 haneli)"""
    if not vkn or len(vkn) != 10 or not vkn.isdigit():
        return False
    
    # VKN algoritması
    digits = [int(d) for d in vkn]
    total = 0
    
    for i in range(9):
        tmp = (digits[i] + (9 - i)) % 10
        total += (tmp * (2 ** (9 - i))) % 9
        if tmp != 0 and (tmp * (2 ** (9 - i))) % 9 == 0:
            total += 9
    
    total = (10 - (total % 10)) % 10
    
    return total == digits[9]


def validate_tckn(tckn: str) -> bool:
    """TC Kimlik Numarası doğrulama algoritması (11 haneli)"""
    if not tckn or len(tckn) != 11 or not tckn.isdigit():
        return False
    
    if tckn[0] == '0':
        return False
    
    digits = [int(d) for d in tckn]
    
    # 10. hane kontrolü
    odd_sum = sum(digits[0:9:2])  # 1, 3, 5, 7, 9. haneler
    even_sum = sum(digits[1:8:2])  # 2, 4, 6, 8. haneler
    digit10 = ((odd_sum * 7) - even_sum) % 10
    
    if digit10 != digits[9]:
        return False
    
    # 11. hane kontrolü
    digit11 = sum(digits[0:10]) % 10
    
    return digit11 == digits[10]

