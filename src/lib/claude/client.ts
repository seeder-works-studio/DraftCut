import Anthropic from '@anthropic-ai/sdk';
import { validateProjectSpec } from '@/lib/spec/validator';
import { validateAndFixSpec, formatValidationReport } from '@/lib/spec/post-generation-validator';
import { buildSystemPrompt } from './prompt';
import type { WebsiteContext } from './prompt';
import type { Asset, BrandKit, ProjectSpec } from '@/lib/spec/types';
import type { AIProviderConfig } from '@/components/home/ai-provider-selector';
import { createAgentSession } from '@/lib/agent/video-agent';
import type { AgenticModeConfig } from '@/components/home/settings-dialog';
import { logger } from '@/lib/logger';
import { jsonrepair } from 'jsonrepair';

/**
 * Create Anthropic client for use in agent or other tools
 */
export function anthropic(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
}

/**
 * Sanitize colors in the spec to replace unsupported formats with hex
 */
function sanitizeColors(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeColors(item));
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Check if this is a color property
    const isColorProp =
      key.toLowerCase().includes('color') ||
      key.toLowerCase().includes('background');

    if (isColorProp && typeof value === 'string') {
      // Allow transparent, hex, rgb/rgba colors
      const isValidColor =
        value === 'transparent' ||
        value.match(/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/) ||
        value.match(/^rgba?\(/);

      if (!isValidColor) {
        // Reject LAB/LCH colors and other unsupported formats
        if (value.startsWith('lab(') || value.startsWith('lch(') || value.startsWith('oklab(') || value.startsWith('oklch(')) {
          logger.warn('VideoGeneration', 'Replacing LAB color with fallback', {
            property: key,
            original: value,
            replacement: '#8B5CF6',
          });
          result[key] = '#8B5CF6'; // Brand purple fallback
        } else {
          logger.warn('VideoGeneration', 'Replacing unsupported color format', {
            property: key,
            original: value,
            replacement: '#ffffff',
          });
          result[key] = '#ffffff'; // Fallback to white
        }
      } else {
        result[key] = value;
      }
    } else {
      result[key] = sanitizeColors(value);
    }
  }

  return result;
}

export async function generateVideoSpec(
  userPrompt: string,
  assets: Asset[],
  brandKit: BrandKit | undefined,
  config: AIProviderConfig,
  websiteContext?: WebsiteContext,
  agenticMode?: AgenticModeConfig,
  onProgress?: (message: string) => void
): Promise<ProjectSpec> {
  logger.info('VideoGeneration', 'Starting video spec generation', {
    provider: config.provider,
    model: config.model,
    assetCount: assets.length,
    agenticModeEnabled: agenticMode?.enabled,
    promptLength: userPrompt.length,
  });

  const systemPrompt = buildSystemPrompt(assets, brandKit, websiteContext);
  logger.debug('VideoGeneration', 'System prompt built', {
    promptLength: systemPrompt.length,
    hasBrandKit: !!brandKit,
  });

  let jsonText: string;

  try {
    if (config.provider === 'claude') {
      logger.info('VideoGeneration', 'Using Claude provider', {
        model: config.model || 'claude-sonnet-4-5-20250929',
      });

      const client = new Anthropic({
        apiKey: config.apiKey,
        dangerouslyAllowBrowser: true,
      });

      logger.debug('VideoGeneration', 'Anthropic client created');

      const response = await client.messages.create({
        model: config.model || 'claude-sonnet-4-5-20250929',
        max_tokens: 8192, // Increased for complex multi-skill videos
        temperature: 0.7,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      logger.info('VideoGeneration', 'Claude API response received', {
        stopReason: response.stop_reason,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });

      jsonText =
        response.content[0].type === 'text' ? response.content[0].text : '';
      logger.debug('VideoGeneration', 'Extracted JSON text', {
        length: jsonText.length,
      });
    } else {
      const baseURLs: Record<string, string> = {
        gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        openai: 'https://api.openai.com/v1/chat/completions',
        openrouter: 'https://openrouter.ai/api/v1/chat/completions',
        cerebras: 'https://api.cerebras.ai/v1/chat/completions',
      };

      const endpoint = config.baseURL || baseURLs[config.provider] || baseURLs.openai;
      logger.info('VideoGeneration', `Using ${config.provider} provider`, {
        endpoint,
        model: config.model || 'gpt-4o',
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 8192, // Increased for complex multi-skill videos
        }),
      });

      logger.info('VideoGeneration', 'Provider API response received', {
        status: response.status,
        statusText: response.statusText,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('VideoGeneration', 'Provider API error', {
          status: response.status,
          errorText,
        });
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      logger.debug('VideoGeneration', 'Provider response parsed', {
        hasChoices: !!data.choices,
        choiceCount: data.choices?.length,
      });

      jsonText = data.choices[0].message.content;
      logger.debug('VideoGeneration', 'Extracted JSON text from provider', {
        length: jsonText.length,
      });
    }

    // Clean up JSON if wrapped in markdown code blocks
    jsonText = jsonText.trim();
    logger.debug('VideoGeneration', 'JSON text trimmed', {
      startsWithMarkdown: jsonText.startsWith('```'),
    });

    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      logger.debug('VideoGeneration', 'Removed markdown code blocks');
    }

    // Use jsonrepair to automatically fix common JSON issues
    let spec;
    try {
      // First try to repair the JSON
      const repairedJson = jsonrepair(jsonText);
      logger.debug('VideoGeneration', 'JSON repaired successfully');

      spec = JSON.parse(repairedJson);
      logger.debug('VideoGeneration', 'JSON parsed successfully', {
        hasCanvas: !!spec.canvas,
        hasComposition: !!spec.composition,
        assetCount: spec.assets?.length || 0,
      });
    } catch (parseError) {
      logger.error('VideoGeneration', 'JSON parse error', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        jsonLength: jsonText.length,
        jsonPreview: jsonText.substring(0, 500),
        jsonAtError: jsonText.substring(4600, 4700), // Show area around error position
      });
      throw new Error(
        `Invalid JSON from AI: ${parseError instanceof Error ? parseError.message : String(parseError)}\n\nCheck console logs for details.`
      );
    }

    // Sanitize: strip any invalid assets that Claude hallucinated
    const originalAssetCount = spec.assets?.length || 0;

    // Log what AI generated BEFORE filtering
    if (originalAssetCount > 0) {
      logger.debug('VideoGeneration', 'Assets generated by AI (before filtering)', {
        count: originalAssetCount,
        assets: spec.assets,
      });
    }

    if (Array.isArray(spec.assets)) {
      // Transform assets: some AIs use 'name' or 'src' instead of 'filename'
      spec.assets = spec.assets.map((a: any) => {
        if (a && typeof a === 'object' && !('filename' in a)) {
          // Try 'name' first, then 'src', then 'url'
          const filename = a.name || a.src || a.url;
          if (filename) {
            return { ...a, filename };
          }
        }
        return a;
      });

      // Filter out invalid assets
      spec.assets = spec.assets.filter(
        (a: unknown) =>
          typeof a === 'object' &&
          a !== null &&
          'id' in a &&
          'type' in a &&
          'filename' in a
      );
    } else {
      spec.assets = [];
    }

    if (originalAssetCount !== spec.assets.length) {
      logger.warn('VideoGeneration', 'Filtered invalid assets', {
        before: originalAssetCount,
        after: spec.assets.length,
        removed: originalAssetCount - spec.assets.length,
        assetsAfterFilter: spec.assets,
      });
    }

    // Sanitize colors: convert unsupported color formats to hex
    spec = sanitizeColors(spec);

    logger.info('VideoGeneration', 'Validating project spec');
    const validatedSpec = validateProjectSpec(spec);

    // Log detailed clip information for debugging
    const allClips = validatedSpec.composition?.tracks?.flatMap(t => t.clips || []) || [];
    logger.debug('VideoGeneration', 'Generated clips details', {
      clips: allClips.map(c => ({
        id: c.id,
        type: c.type,
        skillType: c.skillType,
        assetId: c.assetId,
        hasAssetId: !!c.assetId,
      })),
    });

    logger.info('VideoGeneration', 'Project spec validated successfully', {
      duration: validatedSpec.canvas?.duration,
      trackCount: validatedSpec.composition?.tracks?.length || 0,
      clipCount: validatedSpec.composition?.tracks?.reduce((sum, t) => sum + (t.clips?.length || 0), 0) || 0,
    });

    // Post-generation validation and auto-fix
    const availableAssetIds = new Set(assets.map((a) => a.id));
    logger.info('VideoGeneration', 'Running post-generation validation', {
      availableAssets: Array.from(availableAssetIds),
    });
    onProgress?.('🔍 Validating generated video...');

    const validationResult = validateAndFixSpec(validatedSpec, availableAssetIds);
    const validationReport = formatValidationReport(validationResult);

    if (validationResult.issues.length > 0) {
      logger.warn('VideoGeneration', 'Validation issues found', {
        issueCount: validationResult.issues.length,
        issues: validationResult.issues,
        autoFixed: validationResult.autoFixed,
      });

      // Show validation report to user
      console.log('\n📋 Validation Report:\n' + validationReport + '\n');

      if (validationResult.autoFixed && validationResult.fixedSpec) {
        onProgress?.('🔧 Auto-fixed validation issues');
        // Use the fixed spec
        validatedSpec = validationResult.fixedSpec;
        logger.info('VideoGeneration', 'Using auto-fixed spec');
      } else if (!validationResult.valid) {
        logger.error('VideoGeneration', 'Critical validation errors - cannot auto-fix');
        throw new Error(
          'Generated video has critical errors that cannot be auto-fixed:\n\n' +
            validationReport +
            '\n\nPlease try regenerating or upload required assets.'
        );
      }
    } else {
      logger.info('VideoGeneration', 'No validation issues - spec is clean');
      onProgress?.('✅ Validation passed');
    }

    // Agentic refinement (if enabled)
    if (agenticMode?.enabled && config.provider === 'claude') {
      logger.info('VideoGeneration', 'Starting agentic video refinement', {
        targetScore: agenticMode.targetScore,
        maxIterations: agenticMode.maxIterations,
      });
      onProgress?.('🤖 Starting agentic video refinement...');

      try {
        const refinedSpec = await createAgentSession(validatedSpec, assets, {
          targetScore: agenticMode.targetScore,
          maxIterations: agenticMode.maxIterations,
          apiKey: config.apiKey,
          model: config.model,
          onProgress: (update) => {
            logger.debug('VideoGeneration', 'Agentic iteration update', {
              iteration: update.iteration,
              score: update.score,
              message: update.message,
            });
            onProgress?.(
              `🤖 Iteration ${update.iteration}/${agenticMode.maxIterations}: ${update.message} (Score: ${update.score}/100)`
            );
          },
        });

        logger.info('VideoGeneration', 'Agentic refinement completed');

        // Validate refined spec too
        onProgress?.('🔍 Validating refined video...');
        const refinedValidation = validateAndFixSpec(
          validateProjectSpec(refinedSpec),
          availableAssetIds
        );

        if (refinedValidation.autoFixed && refinedValidation.fixedSpec) {
          logger.info('VideoGeneration', 'Auto-fixed refined spec');
          return refinedValidation.fixedSpec;
        }

        return validateProjectSpec(refinedSpec);
      } catch (error) {
        logger.error('VideoGeneration', 'Error during agentic refinement', error);
        throw error;
      }
    }

    logger.info('VideoGeneration', 'Video spec generation completed successfully');
    return validatedSpec;
  } catch (error) {
    logger.error('VideoGeneration', 'Error during video generation', error);
    throw error;
  }
}
