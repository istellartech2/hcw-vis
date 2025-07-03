import scipy.io
import pandas as pd
import numpy as np
import sys
import os

def mat_to_csv_and_merge(mat_file_path):
    """
    MATファイルをCSVに変換し、その後マージする統合関数
    
    Args:
        mat_file_path (str): MATファイルのパス
    """
    
    # MATファイルの読み込み
    print(f"MATファイルを読み込み中: {mat_file_path}")
    mat_data = scipy.io.loadmat(mat_file_path)
    
    # MATファイルの中身を確認
    print("\nMATファイルに含まれる変数:")
    for key in mat_data.keys():
        if not key.startswith('__'):
            print(f"- {key}: {type(mat_data[key])}, shape: {mat_data[key].shape if hasattr(mat_data[key], 'shape') else 'N/A'}")
    
    # データをCSVに変換
    print("\nCSVファイルに変換中...")
    for key in mat_data.keys():
        if not key.startswith('__'):  # システム変数を除外
            data = mat_data[key]
            
            # numpy配列の場合
            if isinstance(data, np.ndarray):
                # 2次元配列の場合はそのままDataFrameに変換
                if data.ndim == 2:
                    df = pd.DataFrame(data)
                    csv_filename = f"{key}.csv"
                    df.to_csv(csv_filename, index=False)
                    print(f"'{key}'を'{csv_filename}'として保存しました")
                
                # 1次元配列の場合
                elif data.ndim == 1:
                    df = pd.DataFrame({key: data})
                    csv_filename = f"{key}.csv"
                    df.to_csv(csv_filename, index=False)
                    print(f"'{key}'を'{csv_filename}'として保存しました")
                
                # 3次元以上の配列の場合
                else:
                    print(f"'{key}'は{data.ndim}次元配列です。各スライスを別々のCSVファイルとして保存します。")
                    for i in range(data.shape[0]):
                        df = pd.DataFrame(data[i])
                        csv_filename = f"{key}_slice_{i}.csv"
                        df.to_csv(csv_filename, index=False)
                        print(f"  - '{csv_filename}'として保存しました")
    
    # マージ処理開始
    print("\nCSVファイルをマージ中...")
    
    # 必要なCSVファイルが存在するかチェック
    required_files = [
        'satellites_positions_slice_0.csv',
        'satellites_positions_slice_1.csv', 
        'satellites_positions_slice_2.csv',
        'T_anime.csv'
    ]
    
    for file in required_files:
        if not os.path.exists(file):
            print(f"エラー: 必要なファイル '{file}' が見つかりません")
            return
    
    # CSVファイルを読み込み - 行が時間ステップ、列が衛星なので転置
    sat_x = pd.read_csv('satellites_positions_slice_0.csv', header=None).T
    sat_y = pd.read_csv('satellites_positions_slice_1.csv', header=None).T
    sat_z = pd.read_csv('satellites_positions_slice_2.csv', header=None).T
    time_data = pd.read_csv('T_anime.csv', header=None)
    
    # 衛星数と時間ステップ数を取得
    num_satellites = sat_x.shape[0]
    num_timesteps = sat_x.shape[1]
    
    print(f"衛星数: {num_satellites}")
    print(f"時間ステップ数: {num_timesteps}")
    
    # ヘッダーを作成
    header = ['Time (s)']
    for i in range(1, num_satellites + 1):
        header.extend([
            f'Sat{i}_X (m)',
            f'Sat{i}_Y (m)', 
            f'Sat{i}_Z (m)',
            f'Sat{i}_Qw',
            f'Sat{i}_Qx',
            f'Sat{i}_Qy',
            f'Sat{i}_Qz'
        ])
    
    # 結果データフレームを初期化
    result_data = []
    
    # 各時間ステップを処理（使用可能な時間データに制限）
    num_timesteps_to_process = min(num_timesteps, time_data.shape[1] - 1)  # -1は最初の列をスキップするため
    
    # 各時間ステップを処理
    for t in range(num_timesteps_to_process):
        # 時間値を2行目から取得、最初の列をスキップするため+1
        row = [time_data.iloc[1, t + 1]]
        
        # 各衛星について
        for sat in range(num_satellites):
            # X, Y, Z位置を追加
            row.append(sat_x.iloc[sat, t])
            row.append(sat_y.iloc[sat, t])
            row.append(sat_z.iloc[sat, t])
            
            # クォータニオン値を追加（デフォルトは単位クォータニオン）
            row.append(1.0)  # Qw
            row.append(0.0)  # Qx
            row.append(0.0)  # Qy
            row.append(0.0)  # Qz
        
        result_data.append(row)
    
    # マージしたデータでDataFrameを作成
    result_df = pd.DataFrame(result_data, columns=header)
    
    # CSVに保存
    output_filename = 'merged_satellite_data.csv'
    result_df.to_csv(output_filename, index=False)
    
    print(f"\nマージしたデータを '{output_filename}' として保存しました")
    print(f"データの形状: {result_df.shape}")
    print(f"衛星数: {num_satellites}")
    print(f"処理した時間ステップ数: {num_timesteps_to_process}")

def main():
    """メイン関数"""
    if len(sys.argv) != 2:
        print("使用法: python mat_to_csv_merge.py <MATファイルのパス>")
        print("例: python mat_to_csv_merge.py results.mat")
        sys.exit(1)
    
    mat_file_path = sys.argv[1]
    
    # ファイルの存在を確認
    if not os.path.exists(mat_file_path):
        print(f"エラー: ファイル '{mat_file_path}' が見つかりません")
        sys.exit(1)
    
    # MATファイルをCSVに変換してマージ
    mat_to_csv_and_merge(mat_file_path)

if __name__ == "__main__":
    main()