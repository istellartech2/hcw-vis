## 高優先度
- [x] CADモデルから衛星形状をインポートする機能
  - [x] CADモデルはglTF(.glb)とstlファイルを読み込めるようにする
  - [x] サイドバーの衛星表示のところの形状選択で、「3Dファイル読込」を作る
  - [x] 3Dファイル読み込みを押すと下に読込ファイルの入力欄ができ、ローカルのファイルを選択できる。選択できるのはglbとstlのみ
  - [x] ファイルを読み込んだら衛星の形状が置き換わる
  - [x] 「3Dファイル読込」時は立方体と同じようにR軸回転、S軸回転が表示される。-180度〜＋180度までとする。スライドバーを動かすと衛星の姿勢が更新される

## 将来実装予定でまだ手を付けない
- [ ] 6自由度の入力csvデータから動きを再現する機能
  - [ ] csvファイルはRSWの位置とクォータニオンの姿勢が時系列で入っている
  - [ ] 適切な形式のcsvファイルであるか確認ができたら、読み込む