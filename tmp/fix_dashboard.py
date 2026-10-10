with open('src/components/DashboardView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix cell-status key={}
text = text.replace(
    '<Cell key={} fill={entry.color} />',
    '<Cell key={`cell-status-${index}`} fill={entry.color} />'
)
text = text.replace(
    '<Cell key={} fill={entry.color} />',
    '<Cell key={`cell-ap-${index}`} fill={entry.color} />'
)

# Fix span className={}
text = text.replace(
    '<span className={}>',
    '<span className={`text-xs font-black ${d.media >= 10 ? "text-emerald-700" : "text-red-600"}`}>'
)

# Fix dadosAssiduidade template
text = text.replace(
    "{dadosAssiduidade.length > 0 ?   : '94.5% Média'}",
    "{dadosAssiduidade.length > 0 ? `${(dadosAssiduidade.reduce((acc, c) => acc + c.Presenças, 0) / dadosAssiduidade.length).toFixed(1)}% Média` : '94.5% Média'}"
)

with open('src/components/DashboardView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Fixed syntax errors successfully')
