import requests, json, time, os, urllib.parse

# Đọc file kanji gốc
with open("2136kanji.json", "r", encoding="utf-8") as f:
    kanji_list = json.load(f)

results = []
missing = []

# Tạo thư mục img nếu chưa tồn tại
img_dir = "img"
os.makedirs(img_dir, exist_ok=True)

for idx, item in enumerate(kanji_list, start=1):
    k = item["kanji"]
    local_id = item["id"]
    print(f"[{idx}/{len(kanji_list)}] Fetching {k} (id={local_id})")

    try:
        url = f"https://api.aanime.tv/v1/guest/search?word={k}"
        r = requests.get(url, timeout=10)
        data = r.json()

        if not data or "kanji" not in data or not data["kanji"]:
            print(f"⚠️ Thiếu dữ liệu cho {k} (id={local_id})")
            missing.append(local_id)
            continue

        # Lưu toàn bộ dữ liệu API
        result_item = {
            "word": data.get("word"),
            "phonetic": data.get("phonetic"),
            "means": data.get("means", []),
            "phoneticOfMean": data.get("phoneticOfMean", ""),
            "kanji": data.get("kanji", [])
        }
        results.append(result_item)

        # Tải ảnh nếu có
        kanji_data = data["kanji"][0]  # lấy kanji đầu tiên
        for i in [1, 2]:
            img_url = kanji_data.get(f"one_time_url_image_{i}")
            if img_url:
                # parse query param i để lấy tên file gốc
                parsed = urllib.parse.urlparse(img_url)
                query = urllib.parse.parse_qs(parsed.query)
                original_file = query.get('i', [f"{kanji_data['id']}_{i}.webp"])[0]
                img_ext = original_file.split('.')[-1]  # đuôi file
                img_path = os.path.join(img_dir, f"{kanji_data['id']}_{k}_{i}.{img_ext}")
                try:
                    img_r = requests.get(img_url, timeout=10)
                    with open(img_path, "wb") as f_img:
                        f_img.write(img_r.content)
                    print(f"   ✅ Tải ảnh {i} về: {img_path}")
                except Exception as e_img:
                    print(f"   ❌ Lỗi tải ảnh {i}: {e_img}")

        time.sleep(0.2)  # delay nhẹ giữa các request

    except Exception as e:
        print(f"❌ Lỗi {k} (id={local_id}): {e}")
        missing.append(local_id)

# Lưu dữ liệu đầy đủ
with open("output.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

# Lưu danh sách kanji thiếu dữ liệu
with open("missing.json", "w", encoding="utf-8") as f:
    json.dump(missing, f, ensure_ascii=False, indent=2)

print("✅ Done! Kết quả ở output.json, kanji thiếu ở missing.json, ảnh trong thư mục img")
