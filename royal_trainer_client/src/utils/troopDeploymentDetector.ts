// royal_trainer_client/src/utils/troopDeploymentDetector.ts
import type { DetectionHistoryItem } from "../types";

// Corrected Detection interface to match your backend structure
interface Detection {
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    width: number;
    height: number;
  };
  confidence: number;
  class_id: number;
  class: string; // Note: backend uses 'class', not 'class_name'
}

export interface TroopDeploymentEvent {
  id: string;
  timestamp: number;
  centerX: number;
  centerY: number;
  detectionCount: number;
  detections: Detection[];
  confidence: number;
  duration: number; // Time span of the deployment
  area: number; // Deployment area size
  troopTypes: string[]; // Types of troops detected
}

export interface DeploymentDetectionConfig {
  timeWindow: number; // Time window in milliseconds (e.g., 2000ms)
  proximityThreshold: number; // Pixel distance for same area (e.g., 100px)
  minDetections: number; // Minimum detections to count as deployment (e.g., 3)
  maxDetections: number; // Maximum detections in window (e.g., 15)
  confidenceThreshold: number; // Minimum confidence for valid detection
}

export class TroopDeploymentDetector {
  private config: DeploymentDetectionConfig;
  private deploymentEvents: TroopDeploymentEvent[] = [];
  private lastProcessedTimestamp: number = 0;

  constructor(config: Partial<DeploymentDetectionConfig> = {}) {
    this.config = {
      timeWindow: 2000, // 2 seconds
      proximityThreshold: 80, // 80 pixels
      minDetections: 3,
      maxDetections: 15,
      confidenceThreshold: 0.6,
      ...config,
    };
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  /**
   * Get center point of a detection
   */
  private getDetectionCenter(detection: Detection): { x: number; y: number } {
    return {
      x: detection.bbox.x1 + detection.bbox.width / 2,
      y: detection.bbox.y1 + detection.bbox.height / 2,
    };
  }

  /**
   * Check if detections are in the same area
   */
  private areInSameArea(detection1: Detection, detection2: Detection): boolean {
    const center1 = this.getDetectionCenter(detection1);
    const center2 = this.getDetectionCenter(detection2);
    const distance = this.calculateDistance(
      center1.x,
      center1.y,
      center2.x,
      center2.y
    );
    return distance <= this.config.proximityThreshold;
  }

  /**
   * Group detections by spatial proximity and time
   */
  private groupDetectionsByArea(
    detections: Array<{ detection: Detection; timestamp: number }>
  ): Array<Array<{ detection: Detection; timestamp: number }>> {
    const groups: Array<Array<{ detection: Detection; timestamp: number }>> =
      [];
    const processed = new Set<number>();

    detections.forEach((item, index) => {
      if (processed.has(index)) return;

      const group: Array<{ detection: Detection; timestamp: number }> = [item];
      processed.add(index);

      // Find all detections in the same area
      for (let i = index + 1; i < detections.length; i++) {
        if (processed.has(i)) continue;

        const otherItem = detections[i];
        const isInSameArea = this.areInSameArea(
          item.detection,
          otherItem.detection
        );
        const isInTimeWindow =
          Math.abs(otherItem.timestamp - item.timestamp) <=
          this.config.timeWindow;

        if (isInSameArea && isInTimeWindow) {
          group.push(otherItem);
          processed.add(i);
        }
      }

      if (
        group.length >= this.config.minDetections &&
        group.length <= this.config.maxDetections
      ) {
        groups.push(group);
      }
    });

    return groups;
  }

  /**
   * Calculate deployment event statistics
   */
  private calculateDeploymentStats(
    group: Array<{ detection: Detection; timestamp: number }>
  ): {
    centerX: number;
    centerY: number;
    confidence: number;
    duration: number;
    area: number;
    troopTypes: string[];
  } {
    // Calculate center point (weighted by confidence)
    let totalX = 0,
      totalY = 0,
      totalConfidence = 0;
    const troopTypes = new Set<string>();

    group.forEach(({ detection }) => {
      const center = this.getDetectionCenter(detection);
      totalX += center.x * detection.confidence;
      totalY += center.y * detection.confidence;
      totalConfidence += detection.confidence;
      troopTypes.add(detection.class);
    });

    const centerX = totalX / totalConfidence;
    const centerY = totalY / totalConfidence;
    const confidence = totalConfidence / group.length;

    // Calculate time duration
    const timestamps = group.map((item) => item.timestamp);
    const duration = Math.max(...timestamps) - Math.min(...timestamps);

    // Calculate deployment area (bounding box of all detections)
    const allX1 = group.map(({ detection }) => detection.bbox.x1);
    const allY1 = group.map(({ detection }) => detection.bbox.y1);
    const allX2 = group.map(({ detection }) => detection.bbox.x2);
    const allY2 = group.map(({ detection }) => detection.bbox.y2);
    const area =
      (Math.max(...allX2) - Math.min(...allX1)) *
      (Math.max(...allY2) - Math.min(...allY1));

    return {
      centerX,
      centerY,
      confidence,
      duration,
      area,
      troopTypes: Array.from(troopTypes),
    };
  }

  /**
   * Process detection history and identify troop deployments
   */
  public detectTroopDeployments(
    history: DetectionHistoryItem[]
  ): TroopDeploymentEvent[] {
    if (!history.length) return this.deploymentEvents;

    // Get all detections from recent history within time window
    const currentTime = Date.now();
    const cutoffTime = currentTime - this.config.timeWindow;

    // Only process new data
    const newHistory = history.filter(
      (item) => item.timestamp > this.lastProcessedTimestamp
    );
    if (!newHistory.length) return this.deploymentEvents;

    // Flatten all detections with timestamps
    const allDetections: Array<{ detection: Detection; timestamp: number }> =
      [];

    history.forEach((historyItem) => {
      if (historyItem.timestamp >= cutoffTime) {
        historyItem.detections
          .filter(
            (detection) =>
              detection.confidence >= this.config.confidenceThreshold
          )
          .forEach((detection) => {
            allDetections.push({
              detection,
              timestamp: historyItem.timestamp,
            });
          });
      }
    });

    // Group detections by area and time
    const deploymentGroups = this.groupDetectionsByArea(allDetections);

    // Create deployment events from groups
    const newDeployments: TroopDeploymentEvent[] = deploymentGroups.map(
      (group) => {
        const stats = this.calculateDeploymentStats(group);

        return {
          id: `deployment_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 9)}`,
          timestamp: Math.min(...group.map((item) => item.timestamp)),
          detectionCount: group.length,
          detections: group.map((item) => item.detection),
          ...stats,
        };
      }
    );

    // Add new deployments and remove old ones
    this.deploymentEvents = [
      ...newDeployments,
      ...this.deploymentEvents.filter((event) => event.timestamp >= cutoffTime),
    ].slice(0, 20); // Keep last 20 deployment events

    this.lastProcessedTimestamp = Math.max(
      ...newHistory.map((item) => item.timestamp)
    );

    return this.deploymentEvents;
  }

  /**
   * Get recent troop deployments
   */
  public getRecentDeployments(
    timeWindow: number = 10000
  ): TroopDeploymentEvent[] {
    const cutoffTime = Date.now() - timeWindow;
    return this.deploymentEvents.filter(
      (event) => event.timestamp >= cutoffTime
    );
  }

  /**
   * Clear deployment history
   */
  public clearDeployments(): void {
    this.deploymentEvents = [];
    this.lastProcessedTimestamp = 0;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<DeploymentDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  public getConfig(): DeploymentDetectionConfig {
    return { ...this.config };
  }

  /**
   * Get deployment statistics
   */
  public getDeploymentStats(): {
    totalDeployments: number;
    averageDetectionsPerDeployment: number;
    averageDeploymentDuration: number;
    mostCommonTroopType: string | null;
    deploymentsPerMinute: number;
  } {
    if (!this.deploymentEvents.length) {
      return {
        totalDeployments: 0,
        averageDetectionsPerDeployment: 0,
        averageDeploymentDuration: 0,
        mostCommonTroopType: null,
        deploymentsPerMinute: 0,
      };
    }

    const recentDeployments = this.getRecentDeployments(60000); // Last minute
    const totalDetections = this.deploymentEvents.reduce(
      (sum, event) => sum + event.detectionCount,
      0
    );
    const totalDuration = this.deploymentEvents.reduce(
      (sum, event) => sum + event.duration,
      0
    );

    // Count troop types
    const troopTypeCounts = new Map<string, number>();
    this.deploymentEvents.forEach((event) => {
      event.troopTypes.forEach((troopType) => {
        troopTypeCounts.set(
          troopType,
          (troopTypeCounts.get(troopType) || 0) + 1
        );
      });
    });

    const mostCommonTroopType =
      troopTypeCounts.size > 0
        ? Array.from(troopTypeCounts.entries()).sort(
            (a, b) => b[1] - a[1]
          )[0][0]
        : null;

    return {
      totalDeployments: this.deploymentEvents.length,
      averageDetectionsPerDeployment:
        totalDetections / this.deploymentEvents.length,
      averageDeploymentDuration: totalDuration / this.deploymentEvents.length,
      mostCommonTroopType,
      deploymentsPerMinute: recentDeployments.length,
    };
  }
}
