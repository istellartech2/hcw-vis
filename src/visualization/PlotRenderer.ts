import { Satellite } from '../simulation/Satellite.js';

export interface PlotContexts {
    xy: CanvasRenderingContext2D;
    xz: CanvasRenderingContext2D;
    yz: CanvasRenderingContext2D;
}

export class PlotRenderer {
    private plotContexts: PlotContexts;
    private plotSize: number = 300;
    private center: number = 150;
    private scale: number = 0.4;
    private colors: string[] = [
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', 
        '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff'
    ];
    
    constructor() {
        const xyCanvas = document.getElementById('plot-xy') as HTMLCanvasElement;
        const xzCanvas = document.getElementById('plot-xz') as HTMLCanvasElement;
        const yzCanvas = document.getElementById('plot-yz') as HTMLCanvasElement;
        
        this.plotContexts = {
            xy: xyCanvas.getContext('2d')!,
            xz: xzCanvas.getContext('2d')!,
            yz: yzCanvas.getContext('2d')!
        };
    }
    
    update(satellites: Satellite[]): void {
        // 各プロットをクリア
        this.clearPlots();
        
        // 衛星をプロット
        satellites.forEach((sat, index) => {
            if (index === 0) {
                this.plotCenterSatellite();
            } else {
                this.plotSatellite(sat, index);
            }
        });
        
        // 軸ラベルを描画
        this.drawAxisLabels();
    }
    
    private clearPlots(): void {
        Object.values(this.plotContexts).forEach(ctx => {
            ctx.clearRect(0, 0, this.plotSize, this.plotSize);
            
            // グリッドを描画
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            
            // 縦線
            for (let i = 0; i <= 10; i++) {
                const x = (this.plotSize / 10) * i;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, this.plotSize);
                ctx.stroke();
            }
            
            // 横線
            for (let i = 0; i <= 10; i++) {
                const y = (this.plotSize / 10) * i;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(this.plotSize, y);
                ctx.stroke();
            }
            
            // 中心線
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.moveTo(this.center, 0);
            ctx.lineTo(this.center, this.plotSize);
            ctx.moveTo(0, this.center);
            ctx.lineTo(this.plotSize, this.center);
            ctx.stroke();
        });
    }
    
    private plotCenterSatellite(): void {
        Object.values(this.plotContexts).forEach(ctx => {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.center, this.center, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }
    
    private plotSatellite(sat: Satellite, index: number): void {
        const pos = sat.getPosition();
        const color = this.colors[(index - 1) % this.colors.length];
        
        // XY平面 (動径方向 - 進行方向)
        const xyX = this.center + pos.y * this.scale * this.plotSize;
        const xyY = this.center - pos.x * this.scale * this.plotSize;
        this.plotContexts.xy.fillStyle = color;
        this.plotContexts.xy.beginPath();
        this.plotContexts.xy.arc(xyX, xyY, 3, 0, 2 * Math.PI);
        this.plotContexts.xy.fill();
        
        // XZ平面 (進行方向 - 軌道面垂直)
        const xzX = this.center + pos.y * this.scale * this.plotSize;
        const xzY = this.center - pos.z * this.scale * this.plotSize;
        this.plotContexts.xz.fillStyle = color;
        this.plotContexts.xz.beginPath();
        this.plotContexts.xz.arc(xzX, xzY, 3, 0, 2 * Math.PI);
        this.plotContexts.xz.fill();
        
        // YZ平面 (動径方向 - 軌道面垂直)
        const yzX = this.center + pos.x * this.scale * this.plotSize;
        const yzY = this.center - pos.z * this.scale * this.plotSize;
        this.plotContexts.yz.fillStyle = color;
        this.plotContexts.yz.beginPath();
        this.plotContexts.yz.arc(yzX, yzY, 3, 0, 2 * Math.PI);
        this.plotContexts.yz.fill();
    }
    
    private drawAxisLabels(): void {
        // XY平面: X=Along-track(進行方向), Y=Radial(動径方向)
        this.plotContexts.xy.fillStyle = '#4ecdc4';
        this.plotContexts.xy.font = '12px Arial';
        this.plotContexts.xy.fillText('Along', this.plotSize - 40, this.center - 5);
        this.plotContexts.xy.fillStyle = '#ff6b6b';
        this.plotContexts.xy.fillText('Radial', this.center + 5, 20);
        
        // XZ平面: X=Along-track(進行方向), Z=Cross-track(軌道面垂直)
        this.plotContexts.xz.fillStyle = '#4ecdc4';
        this.plotContexts.xz.fillText('Along', this.plotSize - 40, this.center - 5);
        this.plotContexts.xz.fillStyle = '#f7b731';
        this.plotContexts.xz.fillText('Cross', this.center + 5, 20);
        
        // YZ平面: Y=Radial(動径方向), Z=Cross-track(軌道面垂直)
        this.plotContexts.yz.fillStyle = '#ff6b6b';
        this.plotContexts.yz.fillText('Radial', this.plotSize - 40, this.center - 5);
        this.plotContexts.yz.fillStyle = '#f7b731';
        this.plotContexts.yz.fillText('Cross', this.center + 5, 20);
    }
}